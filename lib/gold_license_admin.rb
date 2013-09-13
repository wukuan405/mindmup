def generate_user 
  require 'aws-sdk'
  iam = AWS::IAM.new(:access_key_id=>'', :secret_access_key=> '')
  group = iam.groups['mindmup-gold']
  user = iam.users.create('dave-from-irb')
  group.users.add(user)
  key = user.access_keys.create
  puts key[:secret_access_key]
  puts key[:access_key_id]
end
def generate_license aws_key_id, aws_secret, account_name, expiry_in_days, max_size_in_mb
  expiry_in_secs = expiry_in_days * (60*60*24) 
  signer = S3PolicySigner.new
  list = signer.signed_get aws_secret, 'mindmup-' + account_name, "/", expiry_in_secs
  post = signer.signed_policy aws_secret, aws_key_id, 'mindmup-' + account_name, "", max_size_in_mb * 1024 * 1024 , 'text/plain', expiry_in_secs
  {
    accountType: 'mindmup-gold',
    id: aws_key_id,
    policy: post[:policy] ,
    signature: post[:signature],
    account: account_name,
    list: list[:signature],
    expiry: list[:expires]
  }.to_json
end
module MindMup::GoldLicenseAdmin
  get '/gold_license_admin' do
    erb :gold_license_admin
  end
  post '/gold_license_admin' do
    content_type 'text/plain'
    generate_license params[:aws_key], params[:aws_secret], params[:account_name], params[:expiry_days].to_i, params[:max_size].to_i
  end
end
