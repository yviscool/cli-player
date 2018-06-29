var R = require('ramda');

class Song {

    constructor(id, name, album, artists) {
        Object.assign(this, { id, name, album, artists })
    }

    toString() {
        return `${this.name}(${this.album})  ${this.artists}`
    }
}

class Songs {

    constructor(songs) {
        this.songs = this.parseSongs(songs);
    }

    add(songs) {
        var songs = this.parseSongs(songs);
        this.songs = R.concat(songs, this.songs)
    }

    get(selector) {
        return this.songs[selector];
    }

    clear() {
        this.songs = [];
    }


    parseSongs(songs) {
        return R.map(args => new Song(...args), songs)
    }


    getMessage() {
        return R.map(song => '' + song)(this.songs);
    }

    getSelection() {
        return R.map(song => (
            {
                name: '' + song,
                short: song.name,
                value: song.id,
            }
        ))(this.songs);
    }

}

module.exports = Songs;