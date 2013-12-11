require 'pp'
require 'sinatra'
require 'uuid'
require 'aws-sdk'
require 'base64'

require File.dirname(__FILE__)+'/lib/s3_policy_signer.rb'
require File.dirname(__FILE__)+'/lib/browser_detection.rb'
require File.dirname(__FILE__)+'/lib/github_routes.rb'
require File.dirname(__FILE__)+'/lib/dropbox_routes.rb'
require File.dirname(__FILE__)+'/lib/gold_license_admin.rb'
require 'net/http'


def cache_last_news
  if settings.online && !test? then
    news = Net::HTTP.get(URI(ENV['NEWS_URL'] || 'http://blog.mindmup.com/feeds/posts/default?max-results=1' ))
    news =~ /<entry><id>([^<]*)<.*<title[^>]*>([^<]*)</
    set :last_news_id, $1
    set :last_news_title, $2
  end
end
configure do
  set :static_host, ENV['STATIC_HOST'] || '//static.mindmup.com/lib'
  set :static_image_host, ENV['STATIC_IMAGE_HOST'] || '//static.mindmup.com/img'
  set :google_analytics_account, ENV["GOOGLE_ANALYTICS_ACCOUNT"]
  set :s3_website,ENV['S3_WEBSITE']
  set :base_url, ENV['SITE_URL'] || "/"
  set :s3_key_id, ENV['S3_KEY_ID']
  set :s3_form_expiry, (60*60*24*30)
  set :s3_bucket_name, ENV['S3_BUCKET_NAME']
  set :s3_secret_key, ENV['S3_SECRET_KEY']
  set :s3_upload_folder, ENV['S3_UPLOAD_FOLDER']
  set :default_map, ENV['DEFAULT_MAP']|| "map/default"
  set :s3_max_upload_size, ENV['MAX_UPLOAD_SIZE']||100
  set :max_upload_size, ENV['MAX_UPLOAD_SIZE']||100
  set :key_id_generator, UUID.new
  set :current_map_data_version, ENV['CURRENT_MAP_DATA_VERSION'] || "a1"
  set :network_timeout_millis, ENV['NETWORK_TIMEOUT_MILLIS']||10000
  set :publishing_config_url, '/publishingConfig'
  set :proxy_load_url, 's3proxy/'
  set :async_scripts, '//www.google-analytics.com/ga.js'
  set :online, "offline" != ENV['OFFLINE']
  AWS.config(:access_key_id=>settings.s3_key_id, :secret_access_key=>settings.s3_secret_key)
  s3=AWS::S3.new()
  set :s3_bucket, s3.buckets[settings.s3_bucket_name]
  set :root, File.dirname(__FILE__)
  set :cache_prevention_key, settings.key_id_generator.generate(:compact)
  set :static, true
  Rack::Mime::MIME_TYPES['.mup'] = 'application/json'
  Rack::Mime::MIME_TYPES['.mm'] = 'text/xml'
  set :protection, :except => [:frame_options, :http_origin], :origin_whitelist => [ENV['SITE_URL']]
  set :last_news_id, ""
  set :last_news_title, ""
  set :gold_signature_url, ENV['GOLD_SIGNATURE_URL']||"/gold/signature"
  set :export_bucket, {'pdf' => ENV['PDF_EXPORT_BUCKET']}
  cache_last_news
end
get '/' do
  show_map
end
get '/legal/privacy' do
  erb :privacy
end
get '/gd' do

  begin
    state = JSON.parse(params[:state])
    if state['action']=='create' then
      mapid = "new-g"
    else
      mapid = "g1" + state['ids'][0]
    end
    redirect "/#m:"+mapid
  rescue Exception=>e
    puts e
    halt 400, "Google drive state missing or invalid"
  end
end
get '/fb' do
	redirect "http://facebook.com/mindmupapp"
end
get '/trouble' do
 erb :trouble
end
get '/default' do
  redirect "/#m:new"
end
get "/s3/:mapid" do
  redirect "/#m:#{params[:mapid]}"
end

post "/echo" do
  attachment params[:title]
  contents = params[:map]
  if (contents.start_with?('data:')) then
    data = contents.split(',')
    meta = data[0].split(':')[1].split(';')
    content_type meta[0]
    if (meta[1] != 'base64') then
      halt 503, "Unsupported encoding " + meta [1]
    end
    Base64.decode64 data[1]
  else
    content_type 'application/octet-stream'
    contents
  end
end
get %r{/embedded/(.*)} do |mapid|
  @mapid = mapid
  erb :embedded
end
get %r{/map/(.*)} do |mapid|
  redirect "/#m:#{URI::encode(mapid)}"
end

get "/m" do
  show_map
end
get "/layoutPublishingConfig" do
  #formats = {'pdf'=> {bucket: settings.export_bucket['pdf'], upload_folder:'in'} }
  #format_settings = formats[params[:format]]
  format_settings = settings.export_bucket[params[:format]]
  json_fail("#{params[:format]} is not a supported format") unless format_settings

  s3_upload_identifier = settings.key_id_generator.generate(:compact)
  s3_key = 'in/' + s3_upload_identifier + ".json"
  s3_content_type="text/plain"
  signer=S3PolicySigner.new
  @policy=signer.signed_policy settings.s3_secret_key, settings.s3_key_id, format_settings, s3_key, settings.s3_max_upload_size*1024, s3_content_type, settings.s3_form_expiry, "public-read"
  @policy[:upload_identifier] = s3_upload_identifier

  erb :s3UploadConfig
end
get "/publishingConfig" do
  s3_upload_identifier = settings.current_map_data_version +  settings.key_id_generator.generate(:compact)
  s3_key=settings.s3_upload_folder+"/" + s3_upload_identifier + ".json"
  s3_content_type="text/plain"
  signer=S3PolicySigner.new
  @policy=signer.signed_policy settings.s3_secret_key, settings.s3_key_id, settings.s3_bucket_name, s3_key, settings.s3_max_upload_size*1024, s3_content_type, settings.s3_form_expiry, "public-read"
  @policy[:upload_identifier] = s3_upload_identifier
  erb :s3UploadConfig
end

get %r{/browserok/?(.*)} do |mapid|
  session['browserok']=true
  redirect "/#m:#{mapid}"
end


post '/import' do
  file = params['file']
  json_fail('No file uploaded') unless file
  uploaded_size=request.env['CONTENT_LENGTH']
  json_fail('Browser did not provide content length for upload') unless uploaded_size
  json_fail("File too big. Maximum size is #{settings.max_upload_size}kb") if uploaded_size.to_i>settings.max_upload_size*1024
  allowed_types=[".mm", ".mup"]
  uploaded_type= File.extname file[:filename]
  json_fail "unsupported file type #{uploaded_type}" unless allowed_types.include? uploaded_type
  result=File.readlines(file[:tempfile]).join  ' '
  content_type 'text/plain'
  result
end

get "/un" do
  erb :unsupported
end

get '/'+settings.cache_prevention_key+'/:fname' do
  send_file File.join(settings.public_folder, params[:fname])
end

get '/'+settings.cache_prevention_key+'/e/:fname' do
  send_file File.join(settings.public_folder, 'e/'+params[:fname])
end

get '/cache_news' do
  cache_last_news
  "OK "+settings.last_news_id
end

include MindMup::GoldLicenseAdmin
include MindMup::GoldPrivateRoutes
include MindMup::GithubRoutes
include MindMup::DropboxRoutes
include Sinatra::UserAgentHelpers
helpers do
  def show_map
    if (browser_supported? || user_accepted_browser?)
      erb :editor
    else
      response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
      response.headers['Pragma'] = 'no-cache'
      response.headers['Expires'] = '0'
      erb :unsupported
    end
  end
  def user_accepted_browser?
    !(session["browserok"].nil?)
  end
  def browser_supported?
    browser.chrome? || browser.gecko? || browser.safari?
  end
  def json_fail message
    halt %Q!{"error":"#{message}"}!
  end
  def map_key mapid
    (mapid.include?("/") ?  "" : settings.s3_upload_folder + "/") + mapid + ".json"
  end
  def user_cohort
     session["cohort"]= Time.now.strftime("%Y%m%d") if session["cohort"].nil?
     session["cohort"]
  end
  def external_script_path script_name
    if (!settings.online) then
      return script_name.sub "//", "/offline/"
    end
    script_name
  end
  def join_scripts script_url_array
    return script_url_array if (development? || test?)

    target_file="#{settings.public_folder}/#{settings.cache_prevention_key}.js"
    if (!File.exists? target_file) then
      script_url_array.each do |input_file|
        infile = "#{settings.public_folder}/#{input_file}.js"
        if !File.exists? infile then
          halt 503, "Script file not found! #{input_file}"
        end
      end
      File.open(target_file,"w") do |output_file|
        script_url_array.each do |input_file|
          infile = "#{settings.public_folder}/#{input_file}.js"
          content= File.readlines(infile)
          output_file.puts content
        end
      end
    end
    return [settings.cache_prevention_key]
  end
  def load_prefix
    if (!settings.online) then
      "offline"
    else
      ""
    end
  end
end

