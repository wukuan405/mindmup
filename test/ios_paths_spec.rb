require File.join(File.dirname(__FILE__),'spec_helper.rb')

describe 'ios paths' do
  def last_response_config
    n=Nokogiri::HTML last_response.body
    eval(n.xpath('//script[@id="main"]').text().match('MM.main\(([^)]*)\)')[1])
  end
  def last_response_body_xml
    Nokogiri::HTML last_response.body
  end
  before(:each) do
    header "User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.152 Safari/537.22"
    set :earliest_supported_ios_version, 3.0
  end
  describe '/ios/map' do
    it "returns document for ios where body contains the expected class" do
      get 'ios/map'
      last_response_body_xml.xpath('//body')[0]['class'].should == 'ios-wkwebview'
    end
  end
  describe '/ios/editor/APP_VERSION' do
    it "returns document for ios where body contains the expected class if the app version is the earliest supported version" do
      get 'ios/editor/3.0'
      last_response_body_xml.xpath('//body')[0]['class'].should == 'ios-wkwebview'
    end
    it "returns document for ios where body contains the expected class if the app version is later then the earliest supported version" do
      get 'ios/editor/3.1'
      last_response_body_xml.xpath('//body')[0]['class'].should == 'ios-wkwebview'
    end
    it "halts as a 404 if the app version is before the the earliest supported version" do
      get 'ios/editor/2.9'
      last_response.status.should  == 404
      last_response.body.should == ''
    end
  end
  describe "/ios/config" do
    before(:each) do
      set :s3_website,'testS3Url'
      set :base_url, 'http://base_url/'
      set :gold_api_url, 'https://gold_api_url'
      set :gold_bucket_name, 'gold-bucket-name'
      set :static_host, 'https://static-host-name'
      set :public_url, "https://public-url"
      get 'ios/config'
      @json = JSON.parse(last_response.body)
    end
    it "returns the path to the anonymous documents folder" do
      @json["anonymousFolder"].should == "http://testS3Url/testfolder/"
    end
    it "returns the path to the post target url for anonymous documents" do
      @json["anonymousPostUrl"].should == "http://testS3Url/"
    end
    it "returns the document publishing config url" do
      @json["publishingConfigUrl"].should == "http://base_url/publishingConfig"
    end
    it "returns the sharing Url" do
      @json["sharingUrl"].should == "http://base_url/#m:"
    end
    it "returns the gold Api Url" do
      @json["goldApiUrl"].should == "https://gold_api_url/"
    end
    it "returns the gold file Url" do
      @json["goldFileUrl"].should == "https://gold-bucket-name.s3.amazonaws.com/"
    end
    it "returns the static host name" do
      @json["static_host"].should == "https://static-host-name"
    end
    it "returns the public url" do
      @json["public_url"].should == "https://public-url"
    end
    it "returns the url to the help page" do
      @json["help_url"].should == "http://discover.mindmup.com/guide_ios/APP_VERSION/CURRENT_HELP_VERSION"
    end
  end
end
