def generate_user admin_aws_key, admin_aws_secret, account_name, template_bucket_name, renew
  require 'aws-sdk'
  mm_account = 'mindmup-' + account_name

  iam = AWS::IAM.new(:access_key_id=> admin_aws_key, :secret_access_key=> admin_aws_secret)
  
  if renew != "yes" then
    begin
      user = iam.users.create(mm_account)
      policy = %Q!{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource":["arn:aws:s3:::#{mm_account}","arn:aws:s3:::#{mm_account}/*"]
          }
        ]
      }!
      user.policies['s3-bucket-access']= policy
      s3 = AWS::S3.new(:access_key_id=> admin_aws_key, :secret_access_key=> admin_aws_secret)
      bucket = s3.buckets.create(mm_account)
      bucket.cors=s3.buckets[template_bucket_name].cors
    rescue Exception => e
      halt 'error creating user:' + e.message
    end
  else 
      user = iam.users[mm_account]
  end
  halt 'user does not exist' unless user.exists?
  begin
    if user.access_keys.count > 1
      user.access_keys.first.delete
    end
    user.access_keys.create
  rescue Exception => e
    halt 'error creating an user access key:' + e.message
  end
end
def generate_license aws_key_id, aws_secret, account_name, expiry_in_days, max_size_in_mb, mm_aws_secret
  expiry_in_secs = expiry_in_days * (60*60*24) 
  signer = S3PolicySigner.new
  expiration = signer.expiration expiry_in_secs
  list = signer.signed_request "GET", aws_secret, "mindmup-" + account_name, "/", expiration
  post = signer.signed_policy aws_secret, aws_key_id, "mindmup-" + account_name, "", max_size_in_mb * 1024 * 1024 , 'text/plain', expiry_in_secs, ""
  {
    accountType: 'mindmup-gold',
    id: aws_key_id,
    policy: post[:policy] ,
    signature: post[:signature],
    account: account_name,
    list: list,
    expiry: expiration,
    key: signer.encode_secret_key(mm_aws_secret, aws_secret)
  }.to_json
end
module MindMup::GoldLicenseAdmin
  get '/gold_license_admin' do
    erb :gold_license_admin
  end
  post '/gold_license_admin' do
    content_type 'text/plain'
    user_key = generate_user params[:aws_key], params[:aws_secret], params[:account_name], settings.s3_bucket_name, params[:renew_flag] 
    generate_license user_key.access_key_id, user_key.secret_access_key, params[:account_name], params[:expiry_days].to_i, params[:max_size].to_i, params[:aws_secret]
  end
end
module MindMup::GoldPrivateRoutes
  post "/gold/signature" do

    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    headers['Access-Control-Allow-Origin'] = settings.base_url
    headers['Access-Control-Allow-Headers'] = 'accept, authorization, origin'

    # eg ?key=D3EbG0AHAgJhC3wUIw5wB08idhh9bCJCDzMgBi8XNzsWeAMeHWIxfQ==&filename=foo.mup&id=AKIAIT74E4XNDZCOHR3A&account=damjan
    signer=S3PolicySigner.new
    aws_secret = signer.decode_xor_key params[:key], settings.s3_secret_key
    expiry_in_secs = 365 * 60 * 60 * 24
    expiration = signer.expiration expiry_in_secs
    put = signer.signed_request 'PUT', aws_secret, 'mindmup-' + params[:account], "/" + params[:filename], expiration
    get = signer.signed_request 'GET', aws_secret, 'mindmup-' + params[:account], "/" + params[:filename], expiration
    {
      get: get,
      put: put,
      expiry: expiration,
    }.to_json
  end  
end
