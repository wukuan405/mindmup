module MindMup
  module DropboxRoutes
    get '/dropbox' do
      if request.scheme != 'https' then
        redirect request.url.sub(/^http:/,'https:')
      else
        erb :dropbox_auth_request
      end
    end
    get '/dropbox-complete' do
      erb :dropbox_auth_complete
    end
  end
end
