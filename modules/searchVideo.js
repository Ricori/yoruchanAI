import Axios from 'axios';
import replyText from '../replyTextConfig';

const apiurl = 'https://www.cilimao.cc/api/search?size=10&sortDirections=desc&page=0&word=';
const cookies = '__cfduid=dd53cf20e3473b4012b8911acad08d82a1555163021;searchLimited=0';
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36";

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
				"referer": 'https://www.cilimao.cc',
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
                            let size2 = data.result.content[1].content_size;
                            let hash1 = data.result.content[0].infohash;
                            let hash2 = data.result.content[1].infohash;
                            let str = '车名：' + title + '\n出厂时间：' + time + '\n车时：' + duration;
                            str += '\n提车渠道1（大小' + bytesToSize(size1) + '字节）：\n' + hash1;
                            str += '\n提车渠道2（大小' + bytesToSize(size2) + '字节）：\n' + hash2;
                            msg = str;
                        }else{
                            let hash = data.result.content[0].infohash;
                            let str = String('找不到完全一样的车啊！给你一辆差不多的车看看吧：\n' + hash);
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
    return (bytes / Math.pow(1024, i)) + sizes[i];                                                                                                            //return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}


export default searchVideo;