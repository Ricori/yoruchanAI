import Axios from 'axios';
import replyText from '../replyTextConfig';

const apiurl = 'https://app.anitama.net/guide/';

/**
 * anitama搜索
*  @param {string} date 日期
 */
async function doSearch(date) {

    //console.log(date);
    if(!date) date = new Date().Format("yyyyMMdd");
    let msg = replyText.serchError;

    await Axios.get(apiurl + date).then(
        ret =>  {
            if (ret.status == 200) {
                let data = ret.data.data;
                let list = data.list;
                msg = replyText.serchScheduleOk(date);

                list.forEach(fj => {
                    msg += '[' + fj.title + '][' + fj.episode ? fj.episode : ''  + ']\n';

                    msg += fj.originStation + ' ' + fj.originTime + '\n';

                    if(!fj.playSite){
                        msg += '国内无播放日程\n'
                    }else{
                        msg += fj.playSite + ' ' + fj.playTime + '\n';
                        //msg += '播放地址：' + fj.playUrl + '\n';
                    }
                    
                    msg += '\n'
                });


                //console.log(data);

                return msg;
            }
        }
    ).catch(e => {
		console.error(`${new Date().toLocaleString()} [error] TodayAnime ${e}`);
	});

    return msg;
}





export default doSearch;