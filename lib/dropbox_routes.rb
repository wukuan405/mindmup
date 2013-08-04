module MindMup
  module DropboxRoutes
    get '/dropbox' do
      erb :dropbox_auth_request
    end
  end
end
