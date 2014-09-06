if ENV["FORCE_SSL"] === "YES" then
 require 'rack/ssl-enforcer'
 use Rack::SslEnforcer, :ignore => ['/export_browser_maps', '/publishingConfig', '/static', '/cache_news', '/trouble']
end
require File.dirname(__FILE__)+'/web.rb'
$stdout.sync = true
use Rack::Session::Cookie,  :expire_after => 2678400, # In seconds
                            :secret => ENV['RACK_SESSION_SECRET']
run Sinatra::Application
