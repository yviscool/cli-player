var MusicApi = require('@suen/music-api');
var { pipe, reject, either, equals, pathEq, path, ifElse, test, concat, identity, map } = require('ramda');

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
        sources.push(tempSource);
        this.currentSource = this.sources[0];
    }

    /**
     * 获取 mp3 的播放地址
     */
    getMp3Url(musicIds) {
        return Promise.all(map(
            (id) => this.getRealUrl(id).catch(() => false), musicIds
        )).then(this.parseUrls.bind(this));
    }


    /**
     *  解析 url 
     * @param {*} urlInfo 
     */
    parseUrls(urlInfo) {
        return pipe(
            reject(
                either(
                    equals(false),
                    pathEq(['status'], false),
                )
            ),
            map(pipe(
                path(['data', 'url']),
                ifElse(
                    test(/^\//),
                    concat('http:'), // xiami 要加上 http
                    identity,
                )
            )),
        )(urlInfo)
    }
}


module.exports = Music;
