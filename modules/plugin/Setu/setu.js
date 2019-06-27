import Axios from 'axios';

export default {
	get: () => Axios.get('https://api.lolicon.app/setu/zhuzhu.php').then(ret => ret.data),
	pxSafeKey: '99887766'
};
