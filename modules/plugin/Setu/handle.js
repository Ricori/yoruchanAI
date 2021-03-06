import CQ from '../../core/CQcode';
import Axios from 'axios';
import config from '../../../config';
import replyText from '../../../replyTextConfig';

const setting = config.yuruConfig;

/**
 * 发送色图
 * @param {object} context
 * @param {object} bot
 * @param {object} replyMsg
 * @param {object} logger
 * @returns 是否发送
 */
function sendSetu(context, botUtil) {
	const setuSetting = setting.setu;
	let setulog = botUtil.logger.getSetuLog();

	if (context.message.search('撤回') !== -1) {
		if (context.group_id) {
			if (setulog.g[context.group_id]) {
				if (setulog.g[context.group_id].now == true && setulog.g[context.group_id].msg) {
					botUtil.bot('delete_msg', { message_id: setulog.g[context.group_id].msg.data.message_id });
					setulog.g[context.group_id] = null;
				}
			}
		} else {
			if (setulog.u[context.user_id]) {
				if (setulog.u[context.user_id].now == true && setulog.u[context.user_id].msg) {
					botUtil.bot('delete_msg', { message_id: setulog.u[context.user_id].msg.data.message_id });
					setulog.u[context.user_id] = null;
				}
			}
		}

		return true;
	}

	if (/([我想要一份快发].*(色|h|瑟)图)/.exec(context.message)) {
		let log;

		//普通群
		let limit = {
			value: setuSetting.limit,
			cd: setuSetting.cd
		};
		let delTime = setuSetting.deleteTime;

		//群聊还是私聊
		if (context.group_id) {
			//白名单群
			if (setuSetting.whiteGroup.includes(context.group_id)) {
				limit.cd = setuSetting.whiteCd;
				delTime = setuSetting.whiteDeleteTime;
			} else if (setuSetting.whiteOnly) {
				botUtil.replyMsg(context, replyText.refuse);
				return true;
			}

			setulog.g[context.group_id] = {
				now: true,
				msg: undefined
			}
			log = setulog.g[context.group_id];

		} else {
			if (!setuSetting.allowPM) {
				botUtil.replyMsg(context, replyText.refuse);
				return true;
			}
			setulog.u[context.user_id] = {
				now: true,
				msg: undefined
			}
			log = setulog.u[context.user_id];
			limit.cd = 0; //私聊无cd
		}

		if (!botUtil.logger.canSearch(context.user_id, limit, 'setu')) {
			botUtil.replyMsg(context, replyText.setuLimit, true);
			return;
		}

		Axios.get('https://api.lolicon.app/setu/zhuzhu.php').then(ret => {
			botUtil.replyMsg(context, CQ.img(`http://127.0.0.1:60233/?key=99887766&url=${ret.data.file}&type=setu`)).then(r => {
				log.now = true;
				log.msg = r;
				if (delTime > 0) {
					setTimeout(() => {
						if (r && r.data && r.data.message_id) botUtil.bot('delete_msg', {
							message_id: r.data.message_id
						});
					}, delTime * 1000)
				};
				setTimeout(() => {
					log = null;
				}, 123 * 1000);
			}).catch(() => {
				console.log(`${new Date().toLocaleString()} [error] delete msg`);
			});
		}).catch(e => {
			console.error(`${new Date().toLocaleString()}\n${e}`);
			botUtil.replyMsg(context, replyText.setuAbnormal);
		});

		return true;
	}
	return false;
}

export default sendSetu;