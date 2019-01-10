const config = {

	host: "127.0.0.1",
	port: 6700,
	enableAPI: true,
	enableEvent: true,
	access_token: "",
	reconnection: true,
	reconnectionAttempts: 10,
	reconnectionDelay: 5000,

	yuruConfig: {
		debug: false,
		admin: [515302066,122308286],
		autoAddFriend: true,
		autoAddGroup: false,
		searchLimit: 30,
		textMode: true,
		repeater: {
			enable: true,
			times: 3
		},
		setu: {
			enable: true,
			allowPM: true,
			cd: 5,
			deleteTime: 0,
			limit: 30,
			whiteGroup: [],
			whiteOnly: false,
			whiteCd: 5,
			whiteDeleteTime: 60
		}
	},
	
	mysql: {
		enable: true,
		host: "127.0.0.1",
		port: 3306,
		db: "yuruchan",
		user: "root",
		password: "ca2326298",
		expire: 172800
	}

}

export default config;