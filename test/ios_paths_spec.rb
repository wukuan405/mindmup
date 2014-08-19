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
  end
  describe '/ios/map' do
    it "returns document for ios where body contains the expected class" do
      get 'ios/map'
      last_response_body_xml.xpath('//body')[0]['class'].should == 'ios-wkwebview'
    end
  end
  describe "/ios/config" do
    it "returns the path to the anonymous documents folder" do
      get 'ios/config'
      json = JSON.parse(last_response.body)
      json["anonymousFolder"].should == "http://testS3Url/testfolder/"
    end
  end
end
