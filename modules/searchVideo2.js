import Axios from 'axios';
import replyText from '../replyTextConfig';

const apiurl = 'http://api.xhub.cn/api.php?op=search_list&page=1&_=';
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36";

/**
 * 搜视频2
 * @param {string} fh
 * @param {object} context
 */
async function searchVideo(fh,context) {

    let msg = replyText.serchError;

    if (context.group_id && !['940472791','829349264'].includes(String(context.group_id))) {
        msg = replyText.limitGroup;
    }else{
        await Axios.get(apiurl + (new Date()).getTime() + '&key=' + fh,{
			headers : {
				"referer": 'http://www.cilimao.in/',
				"user-agent": UA
			}}).then(
            ret =>  {
                if (ret.status == 200) {
                    if(ret.data){
                        let data = ret.data.data;
                        let magnets = Object.keys(data);
                        if(magnets.length < 2){
                            let str = '相关信息过少，请主人尝试更换搜索关键字哦';
                            msg = str;
                        }else{
                            let values = Object.values(data);
                            let title = values[0].title;
                            let time = values[0].day;
                            let size1 = values[0].size;
                            let size2 = values[1].size;
                            let hash1 = magnets[0];
                            let hash2 = magnets[1];
                            let str = `车名：${title}\n出厂时间：${time}`;
                            str += '\n提车渠道1（大小' + size1 + '）：\n' + hash1;
                            str += '\n提车渠道2（大小' + size2 + '）：\n' + hash2;
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
            console.error(`${new Date().toLocaleString()} [error] searchVideo2 ${e}`);
        });
    }

    return msg;
}




export default searchVideo;