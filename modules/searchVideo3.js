import Axios from 'axios';
import md5 from 'md5-node';
import replyText from '../replyTextConfig';

const apiurl = 'https://bt.lansou.pw/api/search?source=%E7%A3%81%E5%8A%9B%E7%8E%8B&page=1&sort=time';
//param: &a=313157408317088516478150&b=14a63768feb60a57d0b9595c671022d4&keyword=ipx-001
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36";

/**
 * 搜视频3
 * @param {string} fh
 * @param {object} context
 */
async function searchVideo(fh,context) {
    let msg = replyText.serchError;
    if (context.group_id && !['940472791','829349264','786345392'].includes(String(context.group_id))) {
        msg = replyText.limitGroup;
    }else{
        let key = getKey();
        let url = apiurl + `&keyword=${fh}&a=${key.a}&b=${key.b}`;
        await Axios.get(url,{
			headers : {
				"referer": 'https://bt.lansou.pw/',
				"user-agent": UA
			}}).then(
            ret => {
                if (ret.status == 200) {
                    if(ret.data && ret.data.success == true){
                        let data = ret.data.data;
                        let list = data.results;
                        if(list.length < 2){
                            let str = '相关信息过少，请主人尝试更换搜索关键字哦';
                            msg = str;
                        }else{
                            let str = '';
                            if(list.length > 4){
                                for (let i = 0; i < 4; i++) {
                                    str += `提车网点${i+1}（重量${list[i].formatSize}）\n车名：${list[i].name}\n生产日期：${list[i].date}\n提货：${list[i].magnet.substr(20)}`;
                                    if(i < 3){
                                        str += '\n\n';
                                    }
                                }
                            }else{
                                for (let i = 0; i < list.length; i++) {
                                    str += `提车网点${i+1}（重量${list[i].formatSize}）\n车名：${list[i].name}\n生产日期：${list[i].date}\n提货：${list[i].magnet.substr(20)}`;
                                    if(i < list.length-1){
                                        str += '\n\n';
                                    }
                                }
                            }
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
            console.error(`${new Date().toLocaleString()} [error] searchVideo3 ${e}`);
        });
    }

    return msg;
}

function getKey(){
    function sf(a, b) {
        let c = '';
        for (let i = a; i > 0; --i) 
            c += b[Math.floor(Math.random() * b.length)];
        return c;
    }
    
    let b,c,d,f,g,h,k,l;
    b = Date.now().toString();
    c = b.length.toString()
    d = ('3' + c + b) + sf( 0x18 - b.length - c.length - 1, '0123456789');
    f = d.substring(0, 3);
    g = b.substring(b.length / 2);
    h = d.substring(d.length / 2);
    k = f + g + '3' + "bt.lansou.pw" + b + h;
    l = md5(k);
    
    return {
        a : d,
        b : l
    }
}



export default searchVideo;