import CQWebsocket from 'cq-websocket';

//核心模块
import CQ from './modules/core/CQcode';
import Yurusql from './modules/core/Yurusql';
import Logger from './modules/core/Logger';

//配置文件
import config from './config';
import replyText from './replyTextConfig';

//工具模块
import {getTime , getDateFromText} from './modules/utils/dateUtil';

//搜图模块
import saucenao from './modules/saucenao';
import { snDB } from './modules/saucenao';
import whatanime from './modules/whatanime';

//其他模块
import animeSale from './modules/animeSale';
import todayAnime from './modules/todayAnime';

//插件模块
import setuHandle from './modules/plugin/Setu/handle';

//初始化数据库
Yurusql.sqlInitialize();

//全局常量
const setting = config.yuruConfig;
const bot = new CQWebsocket(config);
const logger = new Logger();

//好友请求处理
bot.on('request.friend', (context) => {
	bot('set_friend_add_request', {
		flag: context.flag,
		approve: setting.autoAddFriend
	});
});

//管理员命令处理
bot.on('message.private', (e, context) => {
	if (setting.admin.indexOf(context.user_id) > -1) {
		//允许加群
		let search = /--add-group=([0-9]+)/.exec(context.message);
		if (search) {
			replyMsg(context, `即将同意进入群${search[1]}的邀请`);
			//注册一次性监听器
			bot.once('request.group.invite', (context2) => {
				if (context2.group_id == search[1]) {
					bot('set_group_add_request', {
						flag: context2.flag,
						type: "invite",
						approve: true
					});
					replyMsg(context, `夜夜酱已成功进入群${context2.group_id}(｀・ω・´)`);
					return true;
				}
				return false;
			});
			return;
		}

		//停止程序(利用pm2重启)
		if (context.message == '--shutdown') process.exit();

		//封禁
		search = /--ban-([ug])=([0-9]+)/.exec(context.message);
		if (search) {
			Logger.ban(search[1], parseInt(search[2]));
			replyMsg(context, `把不听话的${search[1]=='u'?'用户':'群组'}${search[1]}封掉啦`);
			return;
		}
	}
});


//监听器
if (setting.debug) {
	//私聊
	bot.on('message.private', debugRrivateAndAtMsg);
	//群组@
	bot.on('message.group.@me', debugRrivateAndAtMsg);
} else {
	//私聊
	bot.on('message.private', privateAndAtMsg);
	//群组@
	bot.on('message.group.@me', privateAndAtMsg);
	//群组
	bot.on('message.group', groupMsg);
}

//连接相关监听
bot.on('socket.connecting', 
		(wsType, attempts) => console.log(`${getTime()} 连接中[${wsType}]#${attempts}`))
	.on('socket.failed', 
		(wsType, attempts) => console.log(`${getTime()} 连接失败[${wsType}]#${attempts}`))
	.on('socket.error', 
		(wsType, err) => console.log(`${getTime()} 连接错误[${wsType}]#${attempts}`))
	.on('socket.connect', 
		(wsType, sock, attempts) => {
		console.log(`${getTime()} 连接成功[${wsType}]#${attempts}`);
		
		/* if (setting.admin > 0) {
			setTimeout(() => {
				bot('send_private_msg', {
					user_id: setting.admin,
					message: `夜夜酱已经部署完成([${wsType}]#${attempts})`
				});
			}, 5000)
		} */
		}
	);

//连接
bot.connect();


//调试模式
function debugRrivateAndAtMsg(e, context) {
	if (context.user_id != setting.admin) {
		e.stopPropagation();
		return replyText.debugMode;
	} else {
		privateAndAtMsg(e, context);
	}
}


//通用处理
function commonHandle(e, context) {
	//黑名单检测
	if (Logger.checkBan(context.user_id, context.group_id)) return false;

	//插件
	if (setting.setu.enable) {
		if (setuHandle(context,bot,replyMsg,logger)) return false;
	}

	return true;
}


//私聊以及群组@的处理
async function privateAndAtMsg(e, context) {
	if (!commonHandle(e, context)) return;

	let { group_id, user_id } = context;

	function hasText(text) {
		return context.message.search(text) !== -1;
	}
	
	if(hasText("--")){
		//管理命令
		return;
	} else if (hasText("help")){
		//帮助文本
		return replyText.helptext;
	} else if (hasImage(context.message)) {
		//进行搜图
		e.stopPropagation();
		searchImg(context);
	} else if(hasText("开启搜图模式")){
		e.stopPropagation();
		if (logger.smSwitch(group_id, user_id, true, 
			() => {replyMsg(context, replyText.serchModeAutoOff, true)})
		){
			replyMsg(context, replyText.serchModeOn, true);
		}
		else replyMsg(context, replyText.alreadyInSerchMode, true);
	} else if(hasText("关闭搜图模式")){
		e.stopPropagation();
		if (logger.smSwitch(group_id, user_id, false))
			replyMsg(context, replyText.serchModeOff, true)
		else
			replyMsg(context, replyText.notAtSerchMode, true);
	} else if(hasText("销量") && hasText("番")){
		//番剧销量查询
		let time = '2018-10';
		if(hasText("7月")) time = '2018-07';
		if(hasText("4月")) time = '2018-04';
		if(hasText("1月")) time = '2019-01';
		e.stopPropagation();
		await animeSale(time).then(
			ret => { replyMsg(context, ret) }
		);
	} else if(/(.*?)[有]?什么番/.exec(context.message)){
		//番剧日程查询
		let riqi = /(.*?)[有]?什么番/.exec(context.message)[1];
		let date = getDateFromText(riqi);
		await todayAnime(date.format('yyyyMMdd')).then(
			ret => { replyMsg(context, ret) }
		);
	} else if(hasText("新年礼物")){
		let txt = '最新12月合集\nhttps://pan.baidu.com/s/1w-xXd94oNfIzo_F9Ax1EsQ 提取码: 5wzw';
		replyMsg(context, txt, true);
	} else {
		//其他指令
		return replyText.defaultReply();
	}
}


//群组消息处理
function groupMsg(e, context) {
	if (!commonHandle(e, context)) return;

	let { group_id, user_id } = context;

	//搜图模式检测
	let smStatus = logger.smStatus(group_id, user_id);
	if (smStatus) {
		//获取搜图模式下的搜图参数
		function getDB() {
			let cmd = /^(all|pixiv|danbooru|book|anime)$/.exec(context.message);
			if (cmd) return snDB[cmd[1]] || -1;
			return -1;
		}

		//切换搜图模式
		let cmdDB = getDB();
		if (cmdDB !== -1) {
			logger.smSetDB(group_id, user_id, cmdDB);
			smStatus = cmdDB;
			replyMsg(context, `夜夜酱现在已经切换至[${context.message}]限定搜索模式啦`)
		}

		//有图片则搜图
		if (hasImage(context.message)) {
			//重置搜图TimeOut时间
			logger.smSwitch(group_id, user_id, true, () => {
				replyMsg(context, replyText.serchModeAutoOff, true);
			});
			e.stopPropagation();
			searchImg(context, smStatus);
		}
	} else if (setting.repeater.enable) {  
		//复读机功能

		//随机复读，rptLog得到当前复读次数
		if (logger.rptLog(group_id, user_id, context.message) >= setting.repeater.times) {
			logger.rptDone(group_id);
			//延迟2s后复读
			setTimeout(() => {
				replyMsg(context, context.message);
			}, 2000);
		}
	}
}


/**
 * 搜图
 *
 * @param {object} context
 * @param {number} [customDB=-1]
 * @returns
 */
async function searchImg(context, customDB = -1) {
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


/**
 * 判断消息是否有图片
 *
 * @param {string} msg 消息
 * @returns 有则返回true
 */
function hasImage(msg) {
	return msg.indexOf("[CQ:image") !== -1;
}


/**
 * 回复消息
 *
 * @param {object} context 消息对象
 * @param {string} msg 回复内容
 * @param {boolean} at 是否at发送者
 */
function replyMsg(context, msg, at = false) {
	if (typeof (msg) != "string" || !msg.length > 0) return;
	if (context.group_id) {
		return bot('send_group_msg', {
			group_id: context.group_id,
			message: at ? CQ.at(context.user_id) + msg : msg
		});
	} else if (context.discuss_id) {
		return bot('send_discuss_msg', {
			discuss_id: context.discuss_id,
			message: at ? CQ.at(context.user_id) + msg : msg
		});
	} else if (context.user_id) {
		return bot('send_private_msg', {
			user_id: context.user_id,
			message: msg
		});
	}
}
