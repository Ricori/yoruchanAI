import config from '../config';
const setting = config.yuruConfig;

import Yurusql from './core/Yurusql';

//图源模块
import saucenao from './searchimg/saucenao';
import { snDB } from './searchimg/saucenao';
import whatanime from './searchimg/whatanime';


/**
 * 搜图
 *
 * @param {object} context
 * @param {number} [customDB=-1]
 * @returns
 */
async function searchImg(context, customDB = -1,replyMsg,logger) {
	//提取参数
	function hasCommand(cmd) {
		return context.message.search("限定" + cmd) !== -1;
	}

	//决定搜索库
	let db = snDB.all;
	if (customDB === -1) {
		if (hasCommand("pixiv")) db = snDB.pixiv;
		else if (hasCommand("danbooru")) db = snDB.danbooru;
		else if (hasCommand("book")) db = snDB.book;
		else if (hasCommand("anime")) db = snDB.anime;
		else if (!context.group_id && !context.discuss_id) {
			//私聊搜图模式
			let sdb = logger.smStatus(0, context.user_id);
			if (sdb) {
				db = sdb;
				logger.smSwitch(0, context.user_id, false);
			}
		}
	} else db = customDB;

	//得到图片链接并搜图
	let msg = context.message;
	let imgs = getImgs(msg);
	for (let img of imgs) {
		if (hasCommand("get-url")) replyMsg(context, img.url);
		else {
			//获取缓存
			let hasCache = false;
			let runCache = Yurusql.isEnable() && !hasCommand("purge");
			if (runCache) {
				let sql = new Yurusql();
				let cache = false;
				await sql.getCache(img.file, db).then(ret => {
					cache = ret;
				});
				sql.close();

				//如果有缓存
				if (cache) {
					hasCache = true;
					for (let cmsg of cache) {
						cmsg = new String(cmsg);
						if (cmsg.indexOf('[CQ:share') !== -1) {
							cmsg = cmsg.replace('content=', 'content=&#91;缓存&#93; ');
						} else if (cmsg.indexOf('WhatAnime') !== -1) {
							cmsg = cmsg.replace('&#91;', '&#91;缓存&#93; &#91;');
						}
						replyMsg(context, cmsg);
					}
				}
			}

			if (!hasCache) {
				//检查搜图次数
				if (!logger.canSearch(context.user_id, setting.searchLimit)) {
					replyMsg(context, replyText.searchLimit);
					return;
				}
				//开始搜索
				saucenao(img.url, db, hasCommand("debug")).then(async ret => {
					let success = ret.success; //如果有未成功的则不缓存

					replyMsg(context, ret.msg);
					replyMsg(context, ret.warnMsg);

					//如果需要缓存
					let needCacheMsgs;
					if (Yurusql.isEnable()) {
						needCacheMsgs = [];
						if (ret.msg.length > 0) needCacheMsgs.push(ret.msg);
					}

					//搜番
					if (db == 21 || ret.msg.indexOf("anidb.net") !== -1) {
						await whatanime(img.url, hasCommand("debug")).then(waRet => {
							if (!waRet.success) success = false; //如果搜番有误也视作不成功
							replyMsg(context, waRet.msg);
							if (Yurusql.isEnable() && waRet.msg.length > 0) needCacheMsgs.push(waRet.msg);
						});
					}

					//将需要缓存的信息写入数据库
					if (Yurusql.isEnable() && success) {
						let sql = new Yurusql();
						await sql.addCache(img.file, db, needCacheMsgs);
						sql.close();
					}
				});
			}
		}
	}
}

/**
 * 从消息中提取图片
 *
 * @param {string} msg
 * @returns 图片URL数组
 */
function getImgs(msg) {
	let reg = /\[CQ:image,file=([^,]+),url=([^\]]+)\]/g;
	let result = [];
	let search = reg.exec(msg);
	while (search) {
		result.push({
			file: search[1],
			url: search[2]
		});
		search = reg.exec(msg);
	}
	return result;
}

export default searchImg;