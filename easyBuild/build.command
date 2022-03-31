cd `dirname $0`
git reset --hard origin/main
git pull
yarn
npm rebuild
yarn build