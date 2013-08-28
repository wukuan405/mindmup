module MindMup
  module DropboxRoutes
    get '/dropbox' do
      erb :dropbox_auth_request
    end
    get '/dropbox-complete' do
      erb :dropbox_auth_complete
    end
  end
end
