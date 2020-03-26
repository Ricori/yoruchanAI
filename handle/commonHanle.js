import config from '../config';
const setting = config.yuruConfig;
import REPLYTEXT from '../replyTextConfig';

//插件模块
import setuHandle from '../modules/plugin/Setu/handle';
import searchAnimeHandel from '../modules/plugin/SearchAnime/handle'

export default async function (context, botUtil) {

    //黑名单检测
    if (botUtil.logger.checkBan(context.user_id, context.group_id)) {
        botUtil.replyMsg(context, REPLYTEXT.refuse);
        return true;
    }
    //插件拦截
    if (setting.setu.enable && setuHandle(context, botUtil)) {
        return true;
    }
    if (searchAnimeHandel(context, botUtil)) {
        return true;
    }

    return false;
}