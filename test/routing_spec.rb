require File.join(File.dirname(__FILE__),'spec_helper.rb')

describe 'Map request routing' do
  def last_response_config
    n=Nokogiri::HTML last_response.body
    eval(n.xpath('//script[@id="main"]').text().match('MM.main\(([^)]*)\)')[1])
  end
  before(:each) do
    header "User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.152 Safari/537.22"
  end
  describe 'named map route' do
    it "takes map ID from the url after /map sets and redirects to /#m:<mapId>." do
      get "/map/ABCDEFGH"
      last_response.should be_redirect
      last_response.header["Location"].should=='http://example.org/#m:ABCDEFGH'
    end
    it "can include / in the route" do
      get "/map/ABCD/EFGH"
      last_response.should be_redirect
      last_response.header["Location"].should=='http://example.org/#m:ABCD/EFGH'
    end
  end
  describe "/gd" do
    it "parses JSON to retrieve google IDs and redirects to g1+ID" do
      get '/gd?state=%7B%22ids%22%3A%5B%220B79-DtmfqRMET0x2NHpoLWd5ZWM%22%5D%2C%22action%22%3A%22open%22%2C%22userId%22%3A%22110457656708424572832%22%7D'
      last_response.header["Location"].should=='http://example.org/#m:g10B79-DtmfqRMET0x2NHpoLWd5ZWM'
      last_response.should be_redirect
    end
  end
  describe 'browser whitelisting' do
    before(:each) do
      header "User-Agent", "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
    end
    def last_response_body_xml
      Nokogiri::HTML last_response.body
    end
    it "does not load map config with /map/xxx if the browser is not in the white list" do
      get "/map/ABCD"
      last_response_body_xml.xpath('//script[@id="main"]').should be_empty
    end
    it "does not load map config with / if the browser is not in the white list" do
      header "User-Agent", "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
      get "/"
      last_response_body_xml.xpath('//script[@id="main"]').should be_empty
    end
    it "loads map config if browser is not in white list but users accept the risk" do
      header "User-Agent", "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
      get "/", {}, {'rack.session'=>{'browserok' => true}}
      last_response_body_xml.xpath('//script[@id="main"]').should_not be_empty
    end
    it "enables users to self-approve a browser using /browserok" do
      header "User-Agent", "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"
      session = {}
      get "/browserok/ABC",{}, {'rack.session'=>session}
      session["browserok"].should be_true
      last_response.should be_redirect
      last_response.header["Location"].should=='http://example.org/#m:ABC'
    end
  end
end
