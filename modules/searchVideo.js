import Axios from 'axios';
import replyText from '../replyTextConfig';

const apiurl = 'https://www.cilimao.news/api/search?size=10&sortDirections=desc&page=0&word=';
const cookies = '_ga=GA1.2.1329054468.1560256058; _gid=GA1.2.107345005.1560256058; _gat_gtag_UA_140660799_1=1; noticationShow=1_1; weixinMPShow=1_1; Hm_lvt_26b7094a5a98e2475533e456a977851f=1560256058; Hm_lpvt_26b7094a5a98e2475533e456a977851f=1560256058;searchLimited=0';
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36";

/**
 * 搜视频
 * @param {string} fh
 * @param {object} context
 */
async function searchVideo(fh,context) {

    let msg = replyText.serchError;

    if (context.group_id && !['940472791','829349264'].includes(String(context.group_id))) {
        msg = replyText.limitGroup;
    }else{
        await Axios.get(apiurl + fh,{
			headers : {
				"accept": 'application/json, text/javascript, */*; q=0.01',
				"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
				"cookie": cookies,
				"referer": 'https://www.cilimao.news/',
				"user-agent": UA
			}}).then(
            ret =>  {
                if (ret.status == 200) {
                    if(ret.data.status == "ok"){
                        let data = ret.data.data;
                        if(Object.keys(data.card).length != 0){
                            let title = data.card.work.title;
                            let time = data.card.work.release_time;
                            let duration = data.card.work.video_duration;
                            let size1 = data.result.content[0].content_size;
                            let size2 = data.result.content[1] ? data.result.content[1].content_size : 0;
                            let hash1 = data.result.content[0].infohash;
                            let hash2 = data.result.content[1] ? data.result.content[1].infohash : 'error';
                            let str = `车名：${title}\n出厂时间：${time}\n车时：${duration}`;
                            str += '\n提车渠道1（大小' + bytesToSize(size1) + '）：\n' + hash1;
                            str += '\n提车渠道2（大小' + bytesToSize(size2) + '）：\n' + hash2;
                            msg = str;
                        }else{
                            let hash1 = data.result.content[0].infohash;
                            let hash2 = data.result.content[3] ? data.result.content[3].infohash : 'error';
                            let size1 = data.result.content[0].content_size;
                            let size2 = data.result.content[3] ? data.result.content[3].content_size : 0;
                            let str = String('找到车了，但是没有车辆详细信息，主人自己去验车吧：');
                            str += '\n提车渠道1（大小' + bytesToSize(size1) + '）：\n' + hash1;
                            str += '\n提车渠道2（大小' + bytesToSize(size2) + '）：\n' + hash2;
                            msg = str;
                        }
                    }else{
                        msg = '遇到了奇怪的问题，请找主人解决吧';
                    }
                }else{
                    return replyText.serchError;
                }
            }
        ).catch(e => {
            console.error(`${new Date().toLocaleString()} [error] searchVideo ${e}`);
        });
    }

    return msg;
}

function bytesToSize(bytes) {
    let sizes = ['B','KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toPrecision(3) + sizes[i];                                                                                                            //return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}


export default searchVideo;