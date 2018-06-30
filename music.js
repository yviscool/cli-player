var MusicApi = require('@suen/music-api');
var R = require('ramda');

class Music {

    constructor() {
        this.api = MusicApi;
        this.limit = 20;
        this.offset = 0;
        this.sources = ['qq', 'netease', 'xiami'];
        this.currentSource = this.sources[0];
    }

    search(key = '周杰伦') {
        var source = this.currentSource;
        return this.api[source].searchSong({
            keyword: key,
            limit: this.limit,
            offset: this.offset
        })
    }

    getAlbum(id) {
        return this.api.getSongDetail(this.currentSource, id);
    }

    getRealUrl(id) {
        return this.api.default.getSongUrl(this.currentSource, id);
    }

    switchSource() {
        var { sources } = this;
        var tempSource = sources.shift();
        sources.push(tempSource)
        this.currentSource = this.sources[0];
    }

    parseUrls(urlInfo) {
        return R.pipe(
            R.reject(
                R.either(
                    R.equals(false),
                    R.pathEq(['status'], false),
                )
            ),
            R.map(R.pipe(
                R.path(['data', 'url']),
                R.ifElse(
                    R.test(/^\//),
                    R.concat('http:'), // xiami 要加上 http
                    R.identity,
                )
            )),
        )(urlInfo)
    }
}


module.exports = Music;
