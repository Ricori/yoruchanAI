import CQ from '../../core/CQcode';
import Axios from 'axios';
import cheerio from 'cheerio';

//import config from '../../../config';
//const setting = config.yuruConfig;
//import replyText from '../../../replyTextConfig';
import Yurusql from '../../core/Yurusql';

function MsgHandle(context,bot,replyMsg,logger) {
    //群聊还是私聊
    if (context.group_id) {
        let group = context.group_id;
        let user = context.user_id;
        let state = logger.getSearchAnimeState(group);
        let msg;

        //step1
        if (/测试番剧搜索:(.*)/.exec(context.message)) {
            if(state && state.enable){
                replyMsg(context, '这个群已经有人在使用夜夜酱搜索番剧啦！', true);
                return true;
            }
        
            let searchAnimeName = /测试番剧搜索:(.*)/.exec(context.message)[1];
            if(searchAnimeName == '')  return false;

            logger.switchSearchAnime(group, user, true, () => {
                replyMsg(context, '过长时间没有完成番剧搜索操作，夜夜酱已经释放控制权啦');
                return true;
            });

            searchAnimeStep1(searchAnimeName).then((step1result) => {
                if(step1result.success){
                    if(step1result.length == 0){
                        msg = '夜夜酱没有找到相关的番剧，请主人尝试搜索关键词。'
                        replyMsg(context, msg);
                        logger.switchSearchAnime(group, user, false);
                    }else if(step1result.length == 1){
                        let bangumiList = step1result.data;
                        logger.setSearchAnimeStep(group,2);
                        logger.setSearchBangumiList(group,bangumiList);
                        msg = `夜夜酱找到了1部匹配的番剧：${bangumiList[0].name}，请主人进行确认（发送"确认搜索"）`
                        replyMsg(context, msg);
                    }else{
                        let bangumiList = step1result.data;
                        logger.setSearchAnimeStep(group,2);
                        logger.setSearchBangumiList(group,bangumiList);
                        msg = `夜夜酱找到了${step1result.length}部匹配的番剧：\n` ;
                        for (let i = 0; i < bangumiList.length; i++) {
                            msg += `${i+1}.${bangumiList[i].name} \n`
                        }
                        msg += '请主人进行选择确认（发送"确认搜索"+编号）'
                        replyMsg(context, msg);
                    }
                }else{
                    msg = '夜夜酱好像出现了点问题呢，请主人查看：\n' + step1result.err;
                    replyMsg(context, msg);
                    logger.switchSearchAnime(group, user, false);
                }
            });
            return true;  
        }


        //step2
        if (/确认搜索(\d?)/.exec(context.message)) {
            if(state.enable && state.step == 2){
                if(state.useuser == user){
                    let choose = /确认搜索(\d?)/.exec(context.message)[1];
                    if(choose == ''){
                        choose = 0
                    }else{
                        choose = choose - 1;
                    }

                    let chooseBangumi = state.bangumiList[choose];
                    msg = `${chooseBangumi.id}|${chooseBangumi.name}|${chooseBangumi.url}`
                    replyMsg(context, msg);


                }else{
                    msg = '夜夜酱的番剧搜索功能正在被其他人使用呢，请等待释放控制权。';
                    replyMsg(context, msg, true);
                }
                return true;
            }else{
                return false;
            }
        }



    }else{
        //暂不支持私聊
        return false;
    };


	return false;
}


async function searchAnimeStep1(searchAnimeName) {
    console.log('搜索：' + searchAnimeName);
    let url = escape('https://mikanani.me/Home/Search?page=1&searchstr=' + searchAnimeName);
    await Axios.get(`http://127.0.0.1:60233/?key=99887766&url=${url}&type=search`).then(
        (ret) => {
            let $ = cheerio.load(ret.data);
            let bangumiList = [];
            $('.an-ul li a').each(function(i, elem) {
                let bangumi = {
                    id : 0,
                    name : '',
                    url : ''
                };
                bangumi.id = $(this).attr('href').split('/')[3];
                bangumi.name = $(this).find('.an-text').text();
                bangumi.url = 'https://mikanani.me/Home/Bangumi/' + bangumi.id;
                bangumiList.push(bangumi);
            });
            console.log(`寻找到${bangumiList.length}部番剧...`);

            if(bangumiList.length == 0){
                return {
                    success : true,
                    length : 0
                };
            }

            let sql = new Yurusql();
            for (let i = 0; i < bangumiList.length; i++) {
                sql.addBangumi(bangumiList[i]).then(
                    () => console.log(`[${i}] bangumi insert successfully`)
                ).catch(
                    err => {
                        console.error(`[${i}] bangumi insert ${err}`);
                        return {
                            success : false,
                            err : '[yurusql error]' + err
                        };
                    }
                );
            }
            //setTimeout(() => sql.close(),2500);
            
            return {
                success : true,
                length : bangumiList.length,
                data : bangumiList
            };
        }
    ).catch(e => {
        console.error(`${new Date().toLocaleString()} [error] searchAnime step1 ${e}`);
        return {
            success : false,
            err : '[searchAnime step1 error]' + e
        };
	});
    console.log('why??');
    
    return {
        success : false,
        err : 'unknow error'
    };
}





export default MsgHandle;