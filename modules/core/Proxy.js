import Axios from 'axios';

const app = new(require('koa'))();
const router = require('koa-router')();

router.get('/', ctx => {
	const {
		url,
        key,
        type
	} = ctx.request.query;

	if (key != '99887766' || !url || !type) {
		ctx.status = 403;
		return;
	}

    if(type == 'setu'){
        return Axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://www.pixiv.net'
            }
        }).then(ret => {
            let buffer = Buffer.from(ret.data, 'binary');
            ctx.status = 200;
            ctx.type = ret.headers['content-type'];
            ctx.length = Buffer.byteLength(buffer);
            ctx.body = buffer;
        });
    }else if(type == 'search'){
        const UA = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36';
        const cookies = '__cfduid=d11562e828d872d3f35e4724b8117b25f1561619033; mikan-announcement=7; _ga=GA1.2.714638327.1561619066; _gid=GA1.2.94179577.1561619066;';

        return Axios.get(url, {
            headers : {
                "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                "cookie": cookies,
                "user-agent": UA,
                "referer": "https://mikanani.me"
            }
        }).then(ret => {
            ctx.status = 200;
            ctx.type = ret.headers['content-type'];
            ctx.body = ret.data;
        });

    }

});

app.use(router.routes());
app.listen(60233);

export default {
	pxSafeKey: '99887766'
};


console.log(`Proxy Server: listen 60233 .. `)