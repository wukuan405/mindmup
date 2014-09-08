module MindMup
  module DropboxRoutes
    get '/dropbox' do
      erb :dropbox_auth_request
    end
    get %r{/dropbox-via-(.*)} do |proto|
      @actual_proto = proto 
      erb :dropbox_auth_request
    end
    get '/dropbox-complete' do
      erb :dropbox_auth_complete
    end
    get '/dropbox-error' do
      erb :dropbox_auth_error
    end
  end
end
