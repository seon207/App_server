const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const crypto = require('crypto');   //비밀번호 암호화
const mysql = require('mysql');
const { DefaultDeserializer } = require('v8');
const conn = {
    host: '13.125.91.32',  //13.125.91.32
    port: '3306',
    user: 'root',
    password: '00000000',
    database: 'RVSM'
};
var clients = [];
var u_id, u_pass;   //아이디, 비밀번호
let icheck, pcheck = false;
var connection = mysql.createConnection(conn);
connection.connect();

server.listen(3333, () => {
    console.log('Socket IO server listening on port 3333');
});

io.on('connection', function (socket) { //서버 연결
    clients.push(socket);
    console.log("New User");

    socket.on('disconnected', function (data) {
        console.log('Disconnected');

        var i = clients.indexOf(socket);
        clients.splice(i, 1);
    });

    //환자 정보 확인
    socket.on('signup_check', function (data) {
        u_id = data.id;
        h_code = data.h_code;
        p_code = data.p_code;
        console.log("uid: " + u_id + "h_code" + h_code + "p_code" + p_code);
        testQuery = "SELECT NAME FROM PATIENT WHERE HospitalCode=? AND ID=?";   //patient 테이블에서 확인
        connection.query(testQuery, [h_code, p_code], function (err, results, fields) {
            if (err) {
                console.log(err);
            }
            if (results[0] == undefined) {   //병원코드, 환자코드 일치하는 환자 없을 때
                pcheck = false;
                console.log("환자 존재하지 않음");
            }
            else {  //환자 있을 때
                pcheck = true;
                data.name = results[0].NAME;
            }
            data.pcheck = pcheck;
            console.log(data.pcheck);
            socket.emit('check', data);
        })

    });

    socket.on('SignUp', function (data) {   //회원가입
        u_id = data.id;
        u_pass = data.passwd;
        h_code = data.h_code;
        p_code = data.p_code;
        token = data.token;
        console.log("uid: " + u_id + "u_pass" + u_pass + "h_code" + h_code + "p_code" + p_code);
        //환자코드, 병원코드 확인
        testQuery = "SELECT * FROM USER WHERE ID = ?";   //ID 검색
        connection.query(testQuery, u_id, function (err, results, fields) {
            if (err) {
                console.log(err);
            }
            if (results[0] == undefined) {    //ID 중복 아닐 때
                icheck = true;
                let hashpw = crypto.createHash('sha256').update(u_pass).digest('hex');
                testQuery = 'INSERT INTO USER(HospitalCode, ID, PW, PatientID, Token) VALUES(?, ?, ?, ?, ?)';
                connection.query(testQuery, [h_code, u_id, hashpw, p_code, token], function (err, results, fields) {
                    if (err) {
                        console.log(err);
                    }
                    data.signup = 1;
                    console.log("success :" + data.signup);
                    socket.emit('signup_success', data);
                    console.log('success');
                })
            }
            else {  //ID 중복일 때
                icheck = false;
                data.icheck = icheck;
                socket.emit('SignUp', data);
            }
        })
        // console.log("icheck" + icheck);
        // if (icheck == true && pcheck == true) { //환자정보 확인한 후 회원가입하는 경우


        // }
    });

    socket.on('login_info', function (data) {   //로그인
        u_id = data.id;
        u_pass = data.pw;
        testQuery = "SELECT PW FROM USER WHERE ID = ?";   //ID 검색
        connection.query(testQuery, u_id, function (err, results, fields) {
            if (err) {
                console.log(err);
            }
            if (results[0] == undefined) {    //해당 사용자 없을 때
                console.log('사용자 없음');
                data.login = 0;
                socket.emit('login_success', data);
            }
            else {
                hashpw = crypto.createHash('sha256').update(u_pass).digest('hex');
                if (hashpw == results[0].PW) {
                    data.login = 1;
                    socket.emit('login_success', data);
                    console.log('로그인완료');
                } else {
                    console.log('일치하지 않음!');
                    data.login = 0;
                    socket.emit('login_success', data);
                }
            }
        })
    });
});


