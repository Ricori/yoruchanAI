export default async function (context, botUtil) {

    //1.允许加群
    let search = /--add-group=([0-9]+)/.exec(context.message);
    if (search) {
        botUtil.replyMsg(context, `即将同意进入群${search[1]}的邀请`);
        botUtil.once('request.group.invite', (cxt) => {
            if (cxt.group_id == search[1]) {
                botUtil.setGroupAddRequest(cxt);
                replyMsg(context, `夜夜酱已成功进入群${cxt.group_id}`);
                return true;
            }
            return false;
        });
        return;
    }

    //2.停止程序(利用pm2重启)
    if (context.message == '--shutdown') process.exit();

    //3.封禁用户或者群组
    search = /--ban-([ug])=([0-9]+)/.exec(context.message);
    if (search) {
        botUtil.logger.ban(search[1], parseInt(search[2]));
        botUtil.replyMsg(context, `已经把坏孩子${search[1] == 'u' ? '用户' : '群组'}${search[1]}关进小黑屋了`);
        return;
    }
    return;

}