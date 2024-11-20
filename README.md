# Better Themis

Better Themis (hay Curi Judge) là một công cụ chấm bài thi lập trình thi đâu C++ tự động. Phần mềm được đặt là "Better Themis" vì tác giả thấy đi học mà toàn phải đợi Themis chấm bài siêu cấp lâu, vì thế đã nảy sinh ý tưởng cải tiến nó và xây dựng lên phần mềm này, có thể cải tiến một số tính năng, đồng thời có thể tồn tại một số điểm không bằng bản gốc. Tuy nhiên, phần mềm được sinh ra với tiêu chí "nhanh và đúng là được, không cần màu mè"!

---

## Cài đặt và sử dụng

- Yêu cầu: Node JS >= 18.x

```bash
npm install # Tải thư viện cần thiết
```

- Vào file `config.json` để tùy chỉnh một số thư viện ngoài cần thiết (phù hợp với hệ điều hành)

```json
{
  "usersdir": "", // Bỏ qua
  "testdir": "", // Bỏ qua
  "checkerdir": "D:\\better-themis\\Judge\\libs\\checker.exe", // Cần chỉnh sửa
  "timedir": "D:\\better-themis\\Judge\\libs\\time64.exe" // Cần chỉnh sửa
}
```

- Đối với người dùng Windows, để có `checker`, vui lòng vào thư mục `/Judge/checker` và biên dịch file C++ có sẵn ở trong. Sau khi có file `exe`, copy địa chỉ file và paste vào `checker`
- Lựa chọn thư viện `time` phù hợp với máy. VD máy Windows x32 thì chọn `time32.exe`, Windows x64 thì chọn `time64.exe` ở trong thư mục `/Judge/libs` và copy địa chỉ file rồi paste vào `time`.
- Đối với người dùng Ubuntu, ở trong thư mục `Judge/libs` đã có sẵn và paste vào như trên.

- Mở phần mềm

```bash
npm start

# Đối với Linux, chạy lệnh sau để mở phần mềm không cần duy trì mở Terminal (chạy xong lệnh có thể tắt)
npm run start_nc
```

- Đối với Windows, để mở phần mềm không cần mở Terminal/CMD (hoặc không hiện ra cửa sổ Logs) thì vào thư mục `run > windows` và chạy file `start_noconsole.bat`

---

# Better Themis & Web interface

- Đây là tính năng tương tự như một số trang `themis-interface` khác ở trên github, phổ biến như [Themis Web Interface](https://github.com/natsukagami/themis-web-interface)
- Chức năng này sẽ được tự động mở khi chạy Better Themis (hiện tại chưa có chức năng tắt tính năng này, sẽ sớm cập nhật). Link trong local network (kết nối mạng giống nhau, không cần dây mạng LAN): `<ip_server>:3000`, trong đó `<ip_server>` là IP Local Network của máy chủ (máy mở Better Themis)

## Chỉnh sửa dữ liệu tài khoản người dùng

- Trong thư mực `run`, chạy file `config_accounts.bat` (đối với Windows), hoặc chạy lệnh trong Terminal `sh` hoạc `bash` để run file `config_accounts.*`
- Đây là giao diện để chỉnh sửa dữ liệu, chỉ cần thao tác trong ứng dụng được mở sau khi chạy lệnh là dữ liệu được lưu.

---

## Báo cáo lỗi/tính năng

- Nếu bạn muốn báo cáo lỗi hay gợi ý tính năng gì, vui lòng vào trang Issue của repo này để mở, tác giả sẽ sớm phản hồi!

---

Đây là một phần trong dự án [Code Curi](https://codecuri.site/), là phiên bản mã nguồn mở, hoạt động trên máy cá nhân, không cần máy chủ!

###### Hiện tại thì chỉ mới viết đến đây thôi, do tác giá không biết viết README ...
