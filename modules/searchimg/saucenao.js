import Axios from 'axios';
import nhentai from './nhentai';
import CQ from '../core/CQcode';
import config from '../../config';
import replyText from '../../replyTextConfig';

const hosts = ["saucenao.com"];

//let hostsI = 0;

const snDB = {
	all: 999,
	pixiv: 5,
	danbooru: 9,
	book: 18,
	anime: 21
}

/**
 * saucenao搜索
 *
 * @param {string} imgURL 图片地址
 * @param {string} db 搜索库
 * @param {boolean} [debug=false] 是否调试
 * @returns Promise 返回消息、返回提示
 */
async function doSearch(imgURL, db, debug = false) {
	//let hostIndex = (hostsI++) % hosts.length; //决定当前使用的host
	let hostIndex = 0;
	let warnMsg = ""; //返回提示
	let msg = replyText.serchError; //返回消息
	let success = false;

	await getSearchResult(hosts[hostIndex], imgURL, db).then(async ret => {

		//调试模式
		if (debug) {
			console.log(`\n[debug] saucenao[${hostIndex}]: ${hosts[hostIndex]}`);
			console.log(JSON.stringify(ret.data));
		}

		//确保回应正确
		if (ret.data && ret.data.results && ret.data.results.length > 0) {
			let result = ret.data.results[0];
			let header = result.header;
			result = result.data;

			let {
				short_remaining, //短时剩余
				long_remaining, //长时剩余
				similarity, //相似度
				thumbnail //缩略图
			} = header;

			let url = ""; //结果链接
			if (result.ext_urls) {
				url = result.ext_urls[0];
				//如果结果有多个，优先取danbooru
				for (let i = 1; i < result.ext_urls.length; i++) {
					if (result.ext_urls[i].indexOf('danbooru') !== -1)
						url = result.ext_urls[i];
				}
				url = url.replace('http://', 'https://');
			}

			//替换显示
			let pidSearch = /pixiv.+illust_id=([0-9]+)/.exec(url);
			if (pidSearch) url = 'https://pixiv.net/i/' + pidSearch[1];
			let origURL = url.replace('https://', '');

			//如果是yandere得防屏蔽
			//if (url.indexOf('yande.re') !== -1) url = get301URL(url);

			let {
				title, //标题
				member_name, //作者
				jp_name //本子名
			} = result;
			if (!title) title = (origURL.indexOf("anidb.net") === -1) ? replyText.serchOk : "[AniDB]";

			if (member_name && member_name.length > 0)
				title = `「${title}」/「${member_name}」`;

			/*
			//剩余搜图次数
			if (long_remaining < 20)
				warnMsg += CQ.escape(`saucenao：夜夜酱发现主人24h内搜图次数仅剩${long_remaining}次了呢\n`);
			else if (short_remaining < 5)
				warnMsg += CQ.escape(`saucenao：夜夜酱发现主人30s内搜图次数仅剩${short_remaining}次了呢\n`);
			*/
			
			//相似度
			if (similarity < 50)
				warnMsg += CQ.escape(replyText.serchSimilarityLow);

			//回复的消息
			msg = CQ.share(url, `${title}相似度为${similarity}%`, origURL, thumbnail);

			success = true;

			//如果是本子
			if (jp_name && jp_name.length > 0) {
				await nhentai(jp_name).then(res => {
					//有本子搜索结果的话
					if (res.length > 0) {
						origURL = res;
						//url = get301URL(origURL);
						msg = CQ.share(url, `[${similarity}%] ${jp_name}`, origURL, thumbnail);
					} else {
						success = false;
						warnMsg += CQ.escape(replyText.nhentaiError);
						msg = CQ.escape(jp_name);
					}
				})
			}

			//处理返回提示
			if (warnMsg.length > 0) warnMsg = warnMsg.substring(0, warnMsg.lastIndexOf("\n"));
		}
	}).catch(e => {
		console.error(`${new Date().toLocaleString()} [error] saucenao[${hostIndex}]\n${e.toString()}`);
		//console.log(e);
		if (e.response && e.response.status == 429) msg = replyText.saucenaoLimit;
	});

	if (config.yuruConfig.debug) console.log(`${new Date().toLocaleString()} [saucenao][${hostIndex}]\n${msg}`);

	return {
		success,
		msg,
		warnMsg
	};
}


/**
 * 取得搜图结果
 *
 * @param {*} host 自定义saucenao的host
 * @param {*} imgURL 欲搜索的图片链接
 * @param {number} [db=999] 搜索库
 * @returns Axios对象
 */
function getSearchResult(host, imgURL, db = 999) {
	return Axios.get('https://' + host + '/search.php', {
		params: {
			db: db,
			output_type: 2,
			numres: 3,
			url: imgURL
		}
	});
}


export default doSearch;

export {
	snDB
}
