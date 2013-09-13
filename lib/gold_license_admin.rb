def generate_user admin_aws_key, admin_aws_secret, account_name, template_bucket_name 
  require 'aws-sdk'
  mm_account = 'mindmup-' + account_name
  iam = AWS::IAM.new(:access_key_id=> admin_aws_key, :secret_access_key=> admin_aws_secret)
  user = iam.users.create(mm_account)
  policy = %Q!{
    "Version": "2012-10-17",
    "Statement": [
      { 
        "Effect": "Allow",
        "Action": "s3:*",
        "Resource":["arn:aws:s3:::#{mm_account}","arn:aws:s3:::#{mm_account}/*"]
      }
    ]
  }!
  user.policies['s3-bucket-access']= policy
  s3 = AWS::S3.new(:access_key_id=> admin_aws_key, :secret_access_key=> admin_aws_secret)
  bucket = s3.buckets.create(mm_account)
  bucket.cors=s3.buckets[template_bucket_name].cors
  
  user.access_keys.create
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
    user_key = generate_user params[:aws_key], params[:aws_secret], params[:account_name], settings.s3_bucket_name
    generate_license user_key.access_key_id, user_key.secret_access_key, params[:account_name], params[:expiry_days].to_i, params[:max_size].to_i
  end
end
