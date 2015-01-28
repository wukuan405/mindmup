require File.join(File.dirname(__FILE__),'spec_helper.rb')

describe 'Welcome message banner' do
  before(:each) do
    header "User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.152 Safari/537.22"
    set :last_news_id, 'abc'
    set :last_news_title, 'def'
  end
  it "shows initialise welcome on an empty session, but not show any news" do
    local_session={}
    get "/",{}, {'rack.session'=>local_session}
    welcome_div=Nokogiri::HTML(last_response.body).css('#welcome_message')
    welcome_div.should be_empty
    local_session['welcome'].should == true
  end
  it "shows the last news item if different from the session" do
    ['1',1,'true',true].each do |prev_msg| # check for true for legacy, first version just had true instead of numbers
      local_session={'welcome' => prev_msg}
      get "/",{}, {'rack.session'=>local_session}
      welcome_div=Nokogiri::HTML(last_response.body).css('#welcome_message')[0]
      welcome_div.text.should include 'News flash: def'
      local_session['welcome'].should == 'abc'
    end
  end
  it "doesn't show anything if last seen news matches last news id" do
    local_session={'welcome' => 'abc'}
    get "/",{}, {'rack.session'=>local_session}
    welcome_div=Nokogiri::HTML(last_response.body).css('#welcome_message')
    welcome_div.should be_empty
    local_session['welcome'].should == 'abc'
  end
end
