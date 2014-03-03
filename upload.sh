#!/bin/bash
# run with --dryrun to see what will happen
rm -rf compiled
mkdir compiled
cat `grep 'src="/' views/embedded_scripts.erb | sed 's/.*"\/\([^"]*\)".*/public\/\1/'` > compiled/mm-embedded.js
mkdir compiled/e
cp public/e/* compiled/e/
grunt compile
gsed s/static.mindmup.com/d23c2zpg6dm0n.cloudfront.net/g compiled/mindmap.css -i
rc=$?
if [[ $rc != 0 ]] ; then
  echo "grunt failed, bailing out"
  exit $rc
else
  ts=`date +%Y%m%d%H%M%S`
  aws s3 sync $1 --acl public-read compiled s3://static.mindmup.com/compiled/$ts
  echo 'set :compiled_ts,"'$ts'"' > compiled_ts.rb
fi


