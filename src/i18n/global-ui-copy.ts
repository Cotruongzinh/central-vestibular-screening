import { getAppCopy } from '@/i18n/app-copy';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { getLocalizedClinicalTest } from '@/i18n/clinical-test-copy';
import { CLINICAL_TESTS } from '@/constants/clinical-tests';
import { translatePipelineText } from '@/i18n/pipeline-copy';
import type { AppLanguage } from '@/types/app-language';

type PairMaps = { viToEn: Map<string, string>; enToVi: Map<string, string> };

const maps: PairMaps = { viToEn: new Map(), enToVi: new Map() };

function addPair(vi: string, en: string) {
  if (!vi || !en || vi === en) return;
  maps.viToEn.set(vi, en);
  maps.enToVi.set(en, vi);
}

function collectPairs(vi: unknown, en: unknown) {
  if (typeof vi === 'string' && typeof en === 'string') {
    addPair(vi, en);
    return;
  }
  if (Array.isArray(vi) && Array.isArray(en)) {
    const length = Math.min(vi.length, en.length);
    for (let i = 0; i < length; i += 1) collectPairs(vi[i], en[i]);
    return;
  }
  if (vi && en && typeof vi === 'object' && typeof en === 'object') {
    for (const key of Object.keys(vi as Record<string, unknown>)) {
      collectPairs(
        (vi as Record<string, unknown>)[key],
        (en as Record<string, unknown>)[key],
      );
    }
  }
}

collectPairs(getAppCopy('vi'), getAppCopy('en'));
collectPairs(getCoreFlowCopy('vi'), getCoreFlowCopy('en'));
for (const test of CLINICAL_TESTS) {
  collectPairs(getLocalizedClinicalTest(test, 'vi'), getLocalizedClinicalTest(test, 'en'));
}

[
  ['Sẵn sàng', 'Ready'],
  ['sẵn sàng', 'ready'],
  ['Đang tải', 'Loading'],
  ['đang tải', 'loading'],
  ['Lỗi', 'Error'],
  ['lỗi', 'error'],
  ['Đang xin quyền', 'Requesting permission'],
  ['đang xin quyền', 'requesting permission'],
  ['Đang thu mốc', 'Collecting baseline'],
  ['đang thu mốc', 'collecting baseline'],
  ['Đã đặt lại', 'Reset'],
  ['đã đặt lại', 'reset'],
  ['Camera', 'Camera'],
  ['Khuôn mặt', 'Face'],
  ['Mốc tư thế đầu', 'Head baseline'],
  ['Tài nguyên trên thiết bị', 'On-device resources'],
  ['Thông tin kiểm tra hiệu chỉnh', 'Calibration diagnostics'],
  ['Ngữ cảnh bảo mật', 'Secure context'],
  ['Điểm đã lưu', 'Saved points'],
  ['Tốc độ theo dõi (FPS)', 'Tracking rate (FPS)'],
  ['Mẫu', 'Samples'],
  ['mẫu', 'samples'],
  ['giây', 'sec'],
  ['Hoàn tất', 'Completed'],
  ['Đang hoạt động', 'Active'],
  ['Chưa có', 'Not available'],
  ['Không có', 'None'],
  ['Có', 'Yes'],
  ['Không', 'No'],
  ['Mật khẩu', 'Password'],
  ['Nhập mật khẩu', 'Enter password'],
  ['Ít nhất 6 ký tự', 'At least 6 characters'],
  ['Nhập lại mật khẩu', 'Confirm password'],
  ['Ví dụ: Nguyễn Văn B', 'Example: Nguyen Van B'],
  ['Ví dụ: Vestibular Physiotherapist', 'Example: Vestibular Physiotherapist'],
  ['Ví dụ: Central Vestibular Clinic', 'Example: Central Vestibular Clinic'],
  ['https://... hoặc file://...', 'https://... or file://...'],
  ['Biểu tượng y khoa Central Vestibular', 'Central Vestibular medical emblem'],

  ['Phiên đã tự động đăng xuất sau 15 phút không hoạt động.', 'You were signed out automatically after 15 minutes of inactivity.'],
  ['Kiểm tra tự động đăng xuất đã hoàn tất. Phiên làm việc đã được đăng xuất.', 'The inactivity sign-out test is complete. The clinician session has been signed out.'],
  ['Hãy nhập địa chỉ email hợp lệ.', 'Enter a valid email address.'],
  ['Đăng nhập', 'Sign in'],
  ['Đăng nhập bằng tài khoản đã xác minh để bắt đầu phiên làm việc.', 'Sign in with a verified account to start a clinician session.'],
  ['Tài khoản chuyên viên lâm sàng', 'Clinician account'],
  ['BẢO MẬT PHIÊN ĐĂNG NHẬP', 'SESSION SECURITY'],
  ['Ẩn', 'Hide'],
  ['Hiện', 'Show'],
  ['Quên mật khẩu?', 'Forgot password?'],
  ['ĐANG ĐĂNG NHẬP...', 'SIGNING IN...'],
  ['ĐĂNG NHẬP', 'SIGN IN'],
  ['Chưa có tài khoản?', 'Need an account?'],
  ['Đăng ký tài khoản', 'Create account'],
  ['QUAY LẠI', 'BACK'],
  ['Không còn phiên xác thực đang hoạt động. Hãy đăng nhập lại.', 'There is no active authentication session. Sign in again.'],
  ['Đã gửi lại email xác minh. Hãy kiểm tra Inbox và Spam/Junk.', 'Verification email sent again. Check your Inbox and Spam/Junk folders.'],
  ['Firebase chưa ghi nhận email đã xác minh. Nếu bạn vừa bấm link, chờ vài giây rồi kiểm tra lại.', 'Firebase has not confirmed email verification yet. If you just used the link, wait a few seconds and check again.'],
  ['Email đã được xác minh. Bạn có thể tiếp tục vào phiên làm việc.', 'Your email is verified. You can continue to the clinician session.'],
  ['Email đã xác minh', 'Email verified'],
  ['Xác minh email', 'Verify email'],
  ['Tài khoản đã xác minh và sẵn sàng đăng nhập.', 'The account is verified and ready to sign in.'],
  ['Mở email Firebase, bấm liên kết xác minh rồi quay lại ứng dụng.', 'Open the Firebase email, use the verification link, then return to the app.'],
  ['Email tài khoản hiện tại', 'Current account email'],
  ['Các bước xác minh', 'Verification steps'],
  ['1. Mở email xác minh do Firebase gửi.\n2. Bấm liên kết xác minh.\n3. Quay lại Expo Go.\n4. Bấm “TÔI ĐÃ XÁC MINH”.', '1. Open the verification email from Firebase.\n2. Tap the verification link.\n3. Return to Expo Go.\n4. Tap “I HAVE VERIFIED MY EMAIL”.'],
  ['TIẾP TỤC', 'CONTINUE'],
  ['ĐĂNG XUẤT', 'SIGN OUT'],
  ['ĐANG KIỂM TRA...', 'CHECKING...'],
  ['TÔI ĐÃ XÁC MINH', 'I HAVE VERIFIED MY EMAIL'],
  ['GỬI LẠI EMAIL XÁC MINH', 'RESEND VERIFICATION EMAIL'],
  ['VỀ ĐĂNG NHẬP', 'BACK TO SIGN IN'],
  ['Khôi phục mật khẩu', 'Reset password'],
  ['Hệ thống sẽ gửi liên kết đặt lại mật khẩu đến email của tài khoản.', 'A password reset link will be sent to the account email.'],
  ['EMAIL ĐÃ ĐƯỢC GỬI', 'EMAIL SENT'],
  ['Email tài khoản', 'Account email'],
  ['ĐANG GỬI...', 'SENDING...'],
  ['GỬI LIÊN KẾT ĐẶT LẠI', 'SEND RESET LINK'],
  ['Mật khẩu cần ít nhất 6 ký tự.', 'Password must contain at least 6 characters.'],
  ['Mật khẩu nhập lại chưa khớp.', 'The passwords do not match.'],
  ['Tạo tài khoản bằng email và xác minh địa chỉ email trước khi sử dụng ứng dụng.', 'Create an account with email and verify the address before using the app.'],
  ['Thông tin đăng ký', 'Account details'],
  ['Nhập lại mật khẩu', 'Confirm password'],
  ['ĐANG TẠO TÀI KHOẢN...', 'CREATING ACCOUNT...'],
  ['ĐĂNG KÝ', 'CREATE ACCOUNT'],
  ['Xác minh email bắt buộc', 'Email verification required'],
  ['ĐÃ CÓ TÀI KHOẢN · ĐĂNG NHẬP', 'ALREADY HAVE AN ACCOUNT · SIGN IN'],

  ['GIAI ĐOẠN 03P · FR-05', 'PHASE 03P · FR-05'],
  ['Phân quyền truy cập', 'Access control'],
  ['Đang tải thông tin quyền truy cập...', 'Loading access-control information...'],
  ['Phạm vi dữ liệu bệnh nhân', 'Patient data scope'],
  ['Quyền truy cập', 'Permissions'],
  ['Đọc và chỉnh sửa hồ sơ phụ trách', 'Read and edit assigned patient records'],
  ['CHO PHÉP', 'ALLOW'],
  ['Xem hồ sơ toàn cơ sở', 'View clinic-wide patient records'],
  ['KHÔNG CHO PHÉP', 'NOT ALLOWED'],
  ['Chỉnh sửa hồ sơ toàn cơ sở', 'Edit clinic-wide patient records'],
  ['Xem nhật ký của chính mình', 'View own activity log'],
  ['Xem nhật ký toàn cơ sở', 'View clinic-wide activity log'],
  ['Xóa dữ liệu trên thiết bị dùng chung', 'Wipe data on a shared device'],
  ['Phân quyền hiện tại chỉ áp dụng trên thiết bị', 'Current access control is on-device only'],
  ['MỞ DANH SÁCH BỆNH NHÂN', 'OPEN PATIENT RECORDS'],
  ['NHẬT KÝ HOẠT ĐỘNG · 03Q / FR-35', 'ACTIVITY LOG · 03Q / FR-35'],
  ['XÓA DỮ LIỆU THIẾT BỊ DÙNG CHUNG · 03R / FR-34', 'SHARED-DEVICE DATA WIPE · 03R / FR-34'],
  ['VỀ PHIÊN LÀM VIỆC', 'BACK TO CLINICIAN SESSION'],
  ['TÀI KHOẢN XÁC MINH ĐẦU TIÊN → QUẢN TRỊ VIÊN', 'FIRST VERIFIED ACCOUNT → ADMIN'],
  ['TÀI KHOẢN TIẾP THEO → CHUYÊN VIÊN LÂM SÀNG', 'SUBSEQUENT ACCOUNT → CLINICIAN'],

  ['GIAI ĐOẠN 03T · FR-04', 'PHASE 03T · FR-04'],
  ['Hồ sơ chuyên viên', 'Clinician profile'],
  ['Đang tải hồ sơ chuyên viên...', 'Loading clinician profile...'],
  ['FR-04 · HỒ SƠ ĐƯỢC MÃ HÓA', 'FR-04 · ENCRYPTED PROFILE'],
  ['Họ và tên', 'Full name'],
  ['Chuyên khoa / vai trò chuyên môn', 'Specialty / professional role'],
  ['Cơ sở làm việc', 'Practice / workplace'],
  ['Đường dẫn logo cơ sở (tùy chọn)', 'Clinic logo URI (optional)'],
  ['LOGO CƠ SỞ', 'CLINIC LOGO'],
  ['Không thể tải logo từ đường dẫn đã nhập.', 'The logo could not be loaded from the entered URI.'],
  ['Chưa thiết lập logo.', 'No logo has been configured.'],
  ['ĐANG LƯU...', 'SAVING...'],
  ['LƯU HỒ SƠ CHUYÊN VIÊN', 'SAVE CLINICIAN PROFILE'],
  ['Không thể mở hồ sơ chuyên viên.', 'Could not open the clinician profile.'],
  ['Đã lưu hồ sơ chuyên viên trên thiết bị.', 'Clinician profile saved on this device.'],
  ['Logo cơ sở (tùy chọn)', 'Clinic logo (optional)'],
  ['Không thể hiển thị logo đã lưu.', 'The saved logo could not be displayed.'],
  ['CHỌN ẢNH LOGO', 'CHOOSE LOGO IMAGE'],
  ['THAY ĐỔI LOGO', 'CHANGE LOGO'],
  ['XÓA LOGO', 'REMOVE LOGO'],
  ['ĐANG MỞ THƯ VIỆN...', 'OPENING PHOTO LIBRARY...'],
  ['Đã chọn logo. Nhấn Lưu hồ sơ chuyên viên để xác nhận thay đổi.', 'Logo selected. Save the clinician profile to confirm the change.'],
  ['Logo sẽ được xóa khi bạn lưu hồ sơ.', 'The logo will be removed when you save the profile.'],
  ['Đã lưu hồ sơ chuyên viên.', 'Clinician profile saved.'],
  ['Cần quyền truy cập thư viện ảnh để chọn logo cơ sở.', 'Photo-library permission is required to choose a clinic logo.'],
  ['Ảnh logo quá lớn. Hãy chọn ảnh nhỏ hơn 6 MB.', 'The logo image is too large. Choose an image smaller than 6 MB.'],
  ['Thiết bị chưa sẵn sàng để lưu logo.', 'The device is not ready to store the logo.'],
  ['Không nhận được ảnh logo đã chọn.', 'The selected logo image could not be read.'],
  ['Không thể lưu ảnh logo. Hãy thử chọn ảnh khác.', 'The logo image could not be saved. Try another image.'],

  ['GIAI ĐOẠN 03Q · FR-35', 'PHASE 03Q · FR-35'],
  ['Nhật ký hoạt động', 'Activity log'],
  ['Đang tải nhật ký hoạt động...', 'Loading activity log...'],
  ['NHẬT KÝ TOÀN CƠ SỞ', 'CLINIC-WIDE LOG'],
  ['NHẬT KÝ CỦA TÀI KHOẢN', 'ACCOUNT LOG'],
  ['Chưa có mục nhật ký phù hợp', 'No matching log entries'],
  ['Hãy chọn bộ lọc khác hoặc thực hiện thêm thao tác trong ứng dụng.', 'Choose another filter or perform more actions in the app.'],
  ['Phạm vi nhật ký trên thiết bị', 'On-device log scope'],
  ['TẤT CẢ', 'ALL'],
  ['BỆNH NHÂN', 'PATIENT'],
  ['KIỂM TRA', 'TEST'],
  ['BÁO CÁO', 'REPORT'],
  ['TRUY CẬP', 'ACCESS'],
  ['HỆ THỐNG', 'SYSTEM'],
  ['HỆ THỐNG / KHÔNG CÓ TÀI KHOẢN', 'SYSTEM / NO ACCOUNT'],
  ['TÀI KHOẢN HIỆN TẠI', 'CURRENT ACCOUNT'],
  ['CHUYÊN VIÊN KHÁC', 'OTHER CLINICIAN'],
  ['Không thể đọc nhật ký hoạt động đã mã hóa trên thiết bị.', 'Could not read the encrypted activity log on this device.'],

  ['GIAI ĐOẠN 03R · FR-34', 'PHASE 03R · FR-34'],
  ['Xóa dữ liệu trên thiết bị dùng chung', 'Shared-device data wipe'],
  ['Đang kiểm tra phạm vi dữ liệu trên thiết bị...', 'Checking on-device data scope...'],
  ['Không thể tiếp tục', 'Cannot continue'],
  ['Dữ liệu sẽ bị xóa', 'Data to be erased'],
  ['Hồ sơ bệnh nhân', 'Patient records'],
  ['Phiên kiểm tra / kết quả', 'Test sessions / results'],
  ['Dữ liệu theo dõi mắt', 'Eye-tracking data'],
  ['Ghi chú chuyên viên', 'Clinician notes'],
  ['Tổng số bản ghi', 'Total local rows'],
  ['Phạm vi xóa dữ liệu mã hóa', 'Cryptographic erase boundary'],
  ['CHUYÊN VIÊN LÂM SÀNG · KHÔNG CHO PHÉP', 'CLINICIAN · NOT ALLOWED'],
  ['Xóa dữ liệu trên thiết bị khi đăng xuất', 'Erase on-device data when signing out'],
  ['Không thể khôi phục từ dữ liệu trên thiết bị', 'Cannot be recovered from on-device storage'],
  ['ĐANG XÓA DỮ LIỆU...', 'ERASING ON-DEVICE DATA...'],
  ['ĐĂNG XUẤT + XÓA DỮ LIỆU', 'SIGN OUT + ERASE ON-DEVICE DATA'],
  ['HỦY', 'CANCEL'],
  ['XÓA VÀ ĐĂNG XUẤT', 'ERASE AND SIGN OUT'],
  ['Xóa dữ liệu trên thiết bị và đăng xuất?', 'Erase on-device data and sign out?'],
  ['Thao tác này sẽ xóa hồ sơ bệnh nhân, kết quả kiểm tra, dữ liệu theo dõi mắt, ghi chú, nhật ký hoạt động, thông tin phân quyền, hàng đợi đồng bộ và khóa mã hóa trên thiết bị. Không thể khôi phục từ dữ liệu trên thiết bị.', 'This will erase patient records, test results, eye-tracking data, notes, activity logs, access-control data, the sync queue, and the on-device encryption key. The erased on-device data cannot be recovered.'],

  ['Bảo mật phiên đăng nhập', 'Session security'],
  ['Tự động đăng xuất sau 15 phút không hoạt động', 'Automatic sign-out after 15 minutes of inactivity'],
  ['Thời gian tự động đăng xuất FR-06', 'FR-06 inactivity timeout'],
  ['Chạm / cuộn', 'Tap / scroll'],
  ['Được ghi nhận', 'Recorded'],
  ['Nhập văn bản', 'Text input'],
  ['Chuyển nền / mở lại', 'Background / resume'],
  ['Có lưu thời điểm hoạt động', 'Last activity is stored'],
  ['Đăng xuất Firebase', 'Firebase sign-out'],
  ['Đã bật', 'Enabled'],
  ['Kiểm tra thời gian chờ', 'Timeout test'],
  ['CHƯA ĐẠT', 'NOT PASSED'],
  ['Kiểm tra nhanh cơ chế đăng xuất', 'Quick inactivity sign-out test'],
  ['ĐANG MÔ PHỎNG TIMEOUT...', 'SIMULATING TIMEOUT...'],
  ['MÔ PHỎNG TIMEOUT 02G NGAY', 'SIMULATE 02G TIMEOUT NOW'],

  ['GIAI ĐOẠN 03S · FR-40', 'PHASE 03S · FR-40'],
  ['Chế độ đào tạo / trình diễn', 'Demo / training mode'],
  ['ĐANG ĐÀO TẠO', 'TRAINING ACTIVE'],
  ['CHƯA BẬT ĐÀO TẠO', 'TRAINING OFF'],
  ['Không lưu dữ liệu đào tạo', 'Training data is not saved'],
  ['FR-40 · Phạm vi không lưu dữ liệu', 'FR-40 · NO-PERSISTENCE BOUNDARY'],
  ['Không tạo hồ sơ bệnh nhân đào tạo trong SQLite.', 'No training patient record is created in SQLite.'],
  ['Không lưu phiên kiểm tra, kết quả hoặc dữ liệu theo dõi mắt.', 'Test sessions, results, and eye-tracking data are not saved.'],
  ['Không tạo PDF hoặc ghi chú chuyên viên từ lần chạy đào tạo.', 'Training runs do not create PDFs or clinician notes.'],
  ['Có thể chạy một bài kiểm tra hoặc bộ 6 bài kiểm tra đầy đủ.', 'You can run one test or the complete six-test battery.'],
  ['Khác với chế độ bệnh nhân ẩn danh', 'Different from anonymous patient mode'],
  ['Đang đọc phiên...', 'Loading session...'],
  ['Lần chạy', 'Run'],
  ['Thời điểm bắt đầu', 'Started'],
  ['Chưa bắt đầu', 'Not started'],
  ['BẮT ĐẦU LẠI LẦN ĐÀO TẠO', 'RESTART TRAINING RUN'],
  ['BẮT ĐẦU CHẾ ĐỘ ĐÀO TẠO', 'START DEMO / TRAINING'],
  ['TẮT CHẾ ĐỘ ĐÀO TẠO', 'END TRAINING MODE'],

  ['Dữ liệu và bảo mật trên thiết bị', 'On-device data and security'],
  ['Giai đoạn 02D · Nền tảng dữ liệu trên thiết bị', 'Phase 02D · On-device data foundation'],
  ['Cơ sở dữ liệu SQLite', 'SQLite database'],
  ['Cấu trúc dữ liệu', 'Schema'],
  ['Chế độ nhật ký SQLite', 'SQLite journal mode'],
  ['Xóa mềm hồ sơ bệnh nhân', 'Patient soft delete'],
  ['SẴN SÀNG · lưu tối đa 30 ngày trước khi xóa cứng', 'READY · retained up to 30 days before hard deletion'],
  ['Mã hóa', 'Encryption'],
  ['Nơi lưu khóa', 'Key storage'],
  ['Kiểm tra mã hóa / giải mã', 'Encryption / decryption check'],
  ['Nhật ký hoạt động', 'Activity log'],
  ['Có cần Firebase cho 02D không?', 'Does 02D require Firebase?'],
  ['Phạm vi bảo mật ở bước 02D', '02D security boundary'],
  ['MỞ HỒ SƠ BỆNH NHÂN · 02E', 'OPEN PATIENT RECORDS · 02E'],
  ['CHẠY LẠI KIỂM TRA 02D', 'RUN 02D CHECK AGAIN'],
  ['Không thể hoàn tất kiểm tra dữ liệu trên thiết bị.', 'The on-device data check could not be completed.'],
  ['02D CẦN SỬA', '02D NEEDS ATTENTION'],
  ['02D ĐẠT', '02D PASS'],
  ['02D ĐANG KIỂM TRA', '02D CHECKING'],

  ['GIAI ĐOẠN 2 · NỀN TẢNG ỨNG DỤNG', 'PHASE 2 · APP FOUNDATION'],
  ['02A · Nền tảng Firebase', '02A · Firebase foundation'],
  ['CẤU HÌNH FIREBASE SẴN SÀNG', 'FIREBASE CONFIG READY'],
  ['CHƯA CÓ FIREBASE CONFIG', 'FIREBASE CONFIG MISSING'],
  ['Vai trò của Firebase trong ứng dụng', 'How Firebase is used'],
  ['Thiếu biến môi trường', 'Missing environment variables'],
  ['Bước tiếp theo', 'Next step'],

  ['Hỗ trợ sàng lọc rối loạn tiền đình trung ương bằng theo dõi chuyển động mắt.', 'Support central vestibular screening using eye-movement tracking.'],
  ['Xin chào', 'Welcome'],
  ['Đăng nhập hệ thống', 'Sign in'],
  ['tài khoản đã xác minh', 'verified account'],
  ['Sử dụng tài khoản đã xác minh để tiếp tục.', 'Use a verified account to continue.'],
  ['Đang kiểm tra phiên đăng nhập...', 'Checking signed-in session...'],
  ['QUẢN LÝ BỆNH NHÂN', 'MANAGE PATIENTS'],
  ['PHIÊN LÀM VIỆC', 'CLINICIAN SESSION'],
  ['Công cụ dự án', 'Project tools'],
  ['HỒ SƠ BỆNH NHÂN · 02E ĐẠT', 'PATIENT RECORDS · 02E PASS'],
  ['BẢO MẬT PHIÊN ĐĂNG NHẬP · 02G', 'SESSION SECURITY · 02G'],
  ['DỮ LIỆU TRÊN THIẾT BỊ · 02D', 'ON-DEVICE DATA · 02D'],
  ['NỀN TẢNG FIREBASE', 'FIREBASE FOUNDATION'],
  ['KIỂM TRA KỸ THUẬT 01', 'TECHNICAL SPIKE 01'],


  // 03X2 — full-app QA additions. These pairs cover text emitted by services,
  // dynamic technical status helpers, support screens, and legacy labels that
  // are still rendered through AppText/LocalizedPipelineText.
  ['Chuyên viên lâm sàng', 'Clinician'],
  ['Quản trị viên', 'Administrator'],
  ['QUẢN TRỊ VIÊN', 'ADMINISTRATOR'],
  ['CHUYÊN VIÊN LÂM SÀNG', 'CLINICIAN'],
  ['Nữ', 'Female'],
  ['Nam', 'Male'],
  ['Khác', 'Other'],
  ['Không khai báo', 'Not specified'],
  ['ĐÃ HỦY', 'CANCELLED'],
  ['KHÔI PHỤC HỒ SƠ', 'RESTORE RECORD'],
  ['ĐANG KHÔI PHỤC...', 'RESTORING...'],
  ['VỀ DANH SÁCH BỆNH NHÂN', 'BACK TO PATIENTS'],
  ['CẢNH BÁO', 'WARNING'],
  ['CẦN THEO DÕI', 'REVIEW NEEDED'],
  ['CẦN XEM KẾT QUẢ', 'REVIEW RESULT'],
  ['TỐT', 'GOOD'],
  ['KÉM', 'POOR'],
  ['DỌC', 'VERTICAL'],
  ['NGANG', 'HORIZONTAL'],
  ['Giữa', 'Center'],
  ['Giữa phải', 'Center right'],
  ['Giữa trái', 'Center left'],
  ['Trên giữa', 'Top center'],
  ['Trên phải', 'Top right'],
  ['Trên trái', 'Top left'],
  ['Dưới giữa', 'Bottom center'],
  ['Dưới phải', 'Bottom right'],
  ['Dưới trái', 'Bottom left'],
  ['Giữa lệch phải', 'Right of center'],
  ['Kiểm tra giữa-trên', 'Center-upper check'],
  ['Polynomial bậc 2', 'Second-order polynomial'],
  ['ĐANG CHUẨN BỊ...', 'PREPARING...'],
  ['ĐANG XỬ LÝ NGANG...', 'PROCESSING HORIZONTAL...'],
  ['ĐANG XỬ LÝ DỌC...', 'PROCESSING VERTICAL...'],
  ['CHƯA CÓ BỘ DỮ LIỆU', 'NO DATASET'],
  ['không tìm thấy', 'not found'],
  ['03B · HIỆU CHỈNH SẴN SÀNG', '03B · CALIBRATION READY'],
  ['03B · THIẾU DỮ LIỆU', '03B · DATA MISSING'],
  ['DI CHUYỂN MƯỢT', 'SMOOTH MOTION'],
  ['NHẢY NGANG', 'HORIZONTAL JUMPS'],
  ['NHẢY DỌC', 'VERTICAL JUMPS'],
  ['NHÌN NGƯỢC', 'LOOK OPPOSITE'],
  ['GIỮ ÁNH NHÌN', 'HOLD GAZE'],
  ['TRÁI · GIỮA · PHẢI', 'LEFT · CENTER · RIGHT'],
  ['TRÊN · GIỮA · DƯỚI', 'UP · CENTER · DOWN'],
  ['GIỮA · TRÁI · PHẢI · TRÊN · DƯỚI', 'CENTER · LEFT · RIGHT · UP · DOWN'],
  ['Kích thích ở một bên · mắt nhìn về phía đối diện', 'Target on one side · eyes look to the opposite side'],
  ['XA → GẦN MŨI', 'FAR → NEAR THE NOSE'],
  ['Đang chờ tracking', 'Waiting for eye tracking'],
  ['Mất face/eye signal', 'Face/eye signal lost'],
  ['Tracking FPS thấp', 'Low tracking FPS'],
  ['Head pose chưa sẵn sàng', 'Head pose is not ready'],
  ['Giữ đầu/điện thoại ổn định', 'Keep the head and phone steady'],
  ['Đầu đang gần giới hạn kỹ thuật', 'Head position is near the technical limit'],
  ['Tracking FPS trung bình', 'Moderate tracking FPS'],
  ['Tracking ổn định', 'Tracking stable'],
  ['mô-đun', 'module'],
  ['gói thư viện', 'library bundle'],
  ['mô hình', 'model'],
  ['Chia sẻ báo cáo PDF', 'Share PDF report'],
  ['Thiết bị hiện không mở được iOS share sheet.', 'The iOS share sheet is not available on this device.'],
  ['Không thể tạo/chia sẻ báo cáo PDF. Hãy thử lại.', 'The PDF report could not be created or shared. Please try again.'],
  ['Họ tên bệnh nhân là thông tin bắt buộc.', 'Patient name is required.'],
  ['Không tìm thấy hồ sơ bệnh nhân này.', 'This patient record could not be found.'],
  ['Hồ sơ đang ở trạng thái đã xóa mềm. Hãy khôi phục trước khi chỉnh sửa.', 'This record is in the deleted-record archive. Restore it before editing.'],
  ['Ca ẩn danh không cho phép thêm thông tin định danh. Hãy tạo hồ sơ bệnh nhân mới nếu cần.', 'Identifying information cannot be added to an anonymous case. Create a new patient record if needed.'],
  ['Role hiện tại không có quyền truy cập hồ sơ bệnh nhân này.', 'The current role does not have access to this patient record.'],
  ['Không thể xử lý hồ sơ bệnh nhân. Hãy thử lại.', 'The patient record could not be processed. Please try again.'],
  ['Không thể đọc dữ liệu phiên đã mã hóa trên thiết bị.', 'The encrypted session data on this device could not be read.'],
  ['Không thể tạo so sánh theo thời gian từ dữ liệu local hiện có.', 'A longitudinal comparison could not be created from the available on-device data.'],
  ['Phiên test không thuộc hồ sơ/clinician hiện tại.', 'This test session does not belong to the current patient record or clinician.'],
  ['Không thể lưu ghi chú phiên test trên thiết bị.', 'The session note could not be saved on this device.'],
  ['Eye trace hoặc metric chưa ở trạng thái hoàn tất để lưu.', 'The eye trace or technical metric is not complete enough to save.'],
  ['Trace và metric không thuộc cùng một phiên test.', 'The eye trace and technical metric do not belong to the same test session.'],
  ['Loại metric này chưa được hỗ trợ trong result engine 03I.', 'This metric type is not supported by the 03I result engine yet.'],
  ['Không thể lưu phiên test vào bộ nhớ cục bộ. Hãy thử lại.', 'The test session could not be saved on this device. Please try again.'],
  ['Test vừa lưu không khớp vị trí hiện tại trong full battery.', 'The saved test does not match the current position in the full battery.'],
  ['Không tìm thấy full battery đang chạy. Hãy bắt đầu lại từ test đầu tiên.', 'No active full-battery run was found. Start again from the first test.'],
  ['Full battery đang thiếu một test trước đó nên chưa thể nối tiếp.', 'A previous test is missing from the full battery, so the run cannot continue yet.'],
  ['Không thể cập nhật tiến độ full battery cục bộ.', 'The on-device full-battery progress could not be updated.'],
  ['Chỉ Admin local mới được phép xóa toàn bộ dữ liệu trên thiết bị.', 'Only the on-device administrator can erase all data from this device.'],
  ['Không thể hoàn tất local wipe. Dữ liệu chưa được xác nhận là đã xóa hoàn toàn.', 'The on-device data wipe could not be completed or verified.'],
  ['Không tìm thấy clinician profile local.', 'No on-device clinician profile was found.'],
  ['Không thể giải mã clinician profile local.', 'The on-device clinician profile could not be decrypted.'],
  ['Không thể đọc hoặc cập nhật clinician profile.', 'The clinician profile could not be read or updated.'],
  ['Thiếu thông tin tài khoản để xác định quyền truy cập.', 'Account information is missing, so access permissions cannot be determined.'],
  ['Thông tin phân quyền không hợp lệ hoặc không đọc được.', 'The access-control information is invalid or unreadable.'],
  ['Không thể giải mã thông tin phân quyền trên thiết bị.', 'The on-device access-control information could not be decrypted.'],
  ['Không thể tải thông tin phân quyền.', 'Access-control information could not be loaded.'],
  ['Không có thông tin bổ sung.', 'No additional details.'],
  ['Không thể giải mã thông tin bổ sung.', 'Additional details could not be decrypted.'],
  ['Đã giải mã thông tin bổ sung; không có nội dung ngắn để hiển thị.', 'Additional details were decrypted; there is no short summary to display.'],
  ['Khởi tạo vai trò Quản trị viên', 'Administrator role initialized'],
  ['Khởi tạo vai trò Chuyên viên lâm sàng', 'Clinician role initialized'],
  ['Cập nhật hồ sơ chuyên viên', 'Clinician profile updated'],
  ['Cập nhật ngôn ngữ ứng dụng', 'App language updated'],
  ['Tạo hồ sơ bệnh nhân', 'Patient record created'],
  ['Tạo ca ẩn danh', 'Anonymous case created'],
  ['Cập nhật hồ sơ bệnh nhân', 'Patient record updated'],
  ['Xóa mềm hồ sơ', 'Patient record moved to deleted records'],
  ['Khôi phục hồ sơ', 'Patient record restored'],
  ['Xóa vĩnh viễn sau thời gian lưu giữ', 'Patient record permanently deleted after retention period'],
  ['Bắt đầu bộ kiểm tra đầy đủ', 'Full battery started'],
  ['Hoàn tất phiên kiểm tra', 'Test session completed'],
  ['Lưu ghi chú phiên kiểm tra', 'Test-session note saved'],
  ['Tạo PDF báo cáo', 'PDF report created'],
  ['Mở chia sẻ PDF', 'PDF sharing opened'],
  ['Kiểm tra nền tảng dữ liệu trên thiết bị', 'On-device data foundation check'],
  ['Hoàn tất hướng dẫn sử dụng FR-39', 'FR-39 user guide completed'],
  ['Kiểm tra khả năng ngoại tuyến FR-42', 'FR-42 offline readiness check'],
  ['Mở chia sẻ phản hồi FR-41', 'Opened FR-41 feedback sharing'],
  ['Mở chia sẻ báo lỗi FR-41', 'Opened FR-41 bug-report sharing'],
  ['Không thể mở app_settings local.', 'The on-device app settings could not be opened.'],
  ['Không thể đọc hoặc lưu cài đặt ngôn ngữ.', 'The language setting could not be read or saved.'],
  ['Chạy configure-firebase.ps1 trong patch để ghi .env, sau đó restart Metro bằng npx expo start -c.', 'Run configure-firebase.ps1 from the patch to write .env, then restart Metro with npx expo start -c.'],
  ['Không xác định được Metro origin từ URI', 'Metro origin could not be determined from the URI'],
  ['Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.', 'This email is already registered. Sign in or use another email address.'],
  ['Địa chỉ email không hợp lệ.', 'The email address is invalid.'],
  ['Mật khẩu chưa đáp ứng chính sách mật khẩu của Firebase.', 'The password does not meet the Firebase password policy.'],
  ['Không thể kết nối Firebase. Hãy kiểm tra Internet rồi thử lại.', 'Firebase could not be reached. Check your Internet connection and try again.'],
  ['Có quá nhiều yêu cầu trong thời gian ngắn. Hãy chờ một lúc rồi thử lại.', 'Too many requests were made in a short period. Wait a moment and try again.'],
  ['Email/Password chưa được bật trong Firebase Authentication.', 'Email/Password sign-in is not enabled in Firebase Authentication.'],
  ['Phiên xác thực đã hết hạn. Hãy đăng nhập lại.', 'The authentication session has expired. Sign in again.'],
  ['Email hoặc mật khẩu không đúng.', 'The email or password is incorrect.'],
  ['Tài khoản này đã bị vô hiệu hóa.', 'This account has been disabled.'],
  ['Firebase chưa được cấu hình. Hãy hoàn tất 02A trước.', 'Firebase is not configured. Complete 02A first.'],
  ['Đã xảy ra lỗi Firebase. Hãy thử lại.', 'A Firebase error occurred. Please try again.'],

].forEach(([vi, en]) => addPair(vi, en));


const extendedPairs: Array<[string, string]> = [
  ['Kiểm tra Hộp thư đến và Thư rác của', 'Check the Inbox and Spam/Junk folders for'],
  [', sau đó mở liên kết để đặt lại mật khẩu.', ', then open the link to reset the password.'],
  ['Sau khi đăng ký, Firebase sẽ gửi liên kết xác minh tới email này.', 'After registration, Firebase will send a verification link to this email address.'],
  ['1. Mở email xác minh do Firebase gửi.', '1. Open the verification email sent by Firebase.'],
  ['2. Bấm liên kết xác minh.', '2. Open the verification link.'],
  ['3. Quay lại Expo Go.', '3. Return to Expo Go.'],
  ['4. Bấm “TÔI ĐÃ XÁC MINH”.', '4. Tap “I HAVE VERIFIED MY EMAIL”.'],
  ['Thiết lập quyền truy cập cho hai vai trò: Quản trị viên và Chuyên viên lâm sàng.', 'Configure access for the two roles: Administrator and Clinician.'],
  ['Vai trò được khởi tạo và lưu mã hóa trên thiết bị để kiểm tra FR-05 trong Expo Go. Người dùng không thể tự thay đổi vai trò. Bản phát hành chính thức cần xác thực quyền và thành viên cơ sở từ máy chủ.', 'Roles are initialized and stored encrypted on this device for FR-05 testing in Expo Go. Users cannot change their own role. A production release must obtain authoritative permissions and clinic membership from the server.'],
  ['Theo dõi các thao tác có ghi thời gian. Thông tin nhật ký được mã hóa trước khi lưu trên thiết bị.', 'Review timestamped activity. Log data is encrypted before it is stored on this device.'],
  ['mục nhật ký gần nhất', 'most recent log entries'],
  ['Quản trị viên có thể xem toàn bộ nhật ký trên thiết bị. Chuyên viên lâm sàng chỉ xem các thao tác do chính tài khoản của mình thực hiện.', 'Administrators can view the full on-device activity log. Clinicians can view only actions performed by their own account.'],
  ['mục trong bộ lọc', 'entries in this filter'],
  ['03Q chỉ đọc nhật ký được lưu trong SQLite trên thiết bị. Dữ liệu này không tự tải lên đám mây và chưa thay thế cơ chế nhật ký phía máy chủ cần có ở bản phát hành chính thức.', '03Q reads only the activity log stored in on-device SQLite. It is not uploaded to the cloud automatically and does not replace the server-side audit logging required for a production release.'],
  ['Cập nhật họ tên, chuyên khoa, cơ sở làm việc và logo cơ sở. Thông tin được mã hóa trước khi lưu trên thiết bị.', 'Update the clinician name, specialty, workplace, and clinic logo. This information is encrypted before it is stored on the device.'],
  ['Các thông tin bên dưới được mã hóa khi lưu. Vai trò người dùng chỉ hiển thị và không thể thay đổi tại màn này.', 'The fields below are encrypted when saved. The user role is read-only and cannot be changed on this screen.'],
  ['Ở bước 03T, ứng dụng lưu đường dẫn logo để dùng lại trong báo cáo và cài đặt. Chức năng chọn ảnh trực tiếp sẽ được bổ sung ở bước sau.', 'At 03T, the app stores the logo URI so it can be reused in reports and settings. Direct image selection will be added in a later step.'],
  ['Mỗi lần cập nhật được ghi vào Nhật ký hoạt động. Email đăng nhập và vai trò người dùng không thay đổi.', 'Each update is recorded in the Activity Log. The sign-in email and user role are not changed.'],
  ['Chuẩn bị Firebase cho xác thực tài khoản và sao lưu đám mây tùy chọn, trong khi các chức năng chính vẫn ưu tiên dữ liệu trên thiết bị.', 'Firebase provides account authentication and optional cloud backup, while core features remain on-device first.'],
  ['• Firebase Auth: đăng ký, xác minh email, đăng nhập và đặt lại mật khẩu.', '• Firebase Auth: registration, email verification, sign-in, and password reset.'],
  ['• Firestore: chỉ dùng cho hồ sơ tài khoản hoặc sao lưu khi người dùng bật đồng bộ; SQLite trên thiết bị vẫn là nguồn dữ liệu chính.', '• Firestore: used only for account profiles or backup when synchronization is enabled; on-device SQLite remains the primary data source.'],
  ['• Video mắt gốc không được tự động tải lên đám mây.', '• Raw eye-camera video is never uploaded to the cloud automatically.'],
  ['• Quy trình theo dõi mắt kỹ thuật 01A–01K hoạt động độc lập với Firebase.', '• The 01A–01K technical eye-tracking pipeline operates independently of Firebase.'],
  ['Khi 02A sẵn sàng, bước 02B sẽ triển khai đăng ký và xác minh email theo FR-01, sau đó 02C hoàn thiện đăng nhập/đăng xuất.', 'After 02A is ready, 02B implements FR-01 registration and email verification, followed by sign-in and sign-out in 02C.'],
  ['SQLite là nơi lưu dữ liệu chính trên thiết bị. Dữ liệu nhạy cảm được mã hóa ở cấp ứng dụng trước khi lưu.', 'SQLite is the primary on-device data store. Sensitive data is encrypted by the app before it is written.'],
  ['Bước kiểm tra này xác nhận cơ sở dữ liệu, khóa mã hóa AES-GCM và Nhật ký hoạt động trên thiết bị đang sẵn sàng.', 'This check confirms that the database, AES-GCM encryption key, and on-device Activity Log are ready.'],
  ['Đang kiểm tra SQLite, SecureStore và mã hóa AES-256-GCM...', 'Checking SQLite, SecureStore, and AES-256-GCM encryption...'],
  ['bảng', 'tables'],
  ['mục nhật ký trên thiết bị', 'on-device log entries'],
  ['Dữ liệu nhạy cảm được mã hóa trước khi ghi vào SQLite. Tệp cơ sở dữ liệu hiện chưa dùng SQLCipher để mã hóa toàn bộ tệp. Video khuôn mặt gốc cũng không được tự động tải lên đám mây.', 'Sensitive data is encrypted before it is written to SQLite. The database file is not currently protected with whole-file SQLCipher encryption. Raw face-camera video is also never uploaded to the cloud automatically.'],
  ['02D chưa đạt:', '02D check failed:'],
  ['Bước 02D chưa phải chứng nhận tuân thủ HIPAA/GDPR. Bước 02E sử dụng nền tảng dữ liệu này để tạo, tìm kiếm, xem lịch sử, chỉnh sửa và xóa mềm hồ sơ bệnh nhân.', '02D is not a HIPAA/GDPR compliance certification. 02E builds on this data foundation to create, search, review, edit, and soft-delete patient records.'],
  ['Tùy chọn xóa toàn bộ dữ liệu ứng dụng trên thiết bị khi đăng xuất khỏi thiết bị dùng chung.', 'Optionally erase all on-device app data when signing out of a shared device.'],
  ['03R bật cơ chế secure_delete của SQLite, xóa các bản ghi, dọn cơ sở dữ liệu và nhật ký ghi, sau đó xóa khóa AES-256 trong SecureStore. Tài khoản Firebase không bị xóa; chỉ phiên đăng nhập hiện tại được đăng xuất.', '03R enables SQLite secure_delete, removes local records, vacuums the database and write-ahead log, and then deletes the AES-256 key from SecureStore. The Firebase account is not deleted; only the current session is signed out.'],
  ['Xóa toàn bộ dữ liệu trên thiết bị có thể ảnh hưởng đến dữ liệu của nhiều người dùng, vì vậy chỉ Quản trị viên được phép thực hiện thao tác này.', 'Erasing all on-device data can affect multiple users, so only an Administrator can perform this action.'],
  ['Mặc định đang tắt. Bật công tắc để cho phép nút xóa dữ liệu bên dưới.', 'This option is off by default. Turn it on to enable the destructive action below.'],
  ['Thông tin vai trò trên thiết bị cũng sẽ bị xóa. Ở bản thử nghiệm hiện tại, tài khoản xác minh đầu tiên đăng nhập lại có thể được khởi tạo thành Quản trị viên. Bản phát hành chính thức phải xác thực quyền từ máy chủ.', 'The on-device role profile will also be erased. In the current prototype, the first verified account that signs in afterward may be initialized as Administrator again. A production release must obtain authoritative roles from the server.'],
  ['FR-06 tự động đăng xuất sau một khoảng thời gian không có thao tác.', 'FR-06 signs the user out automatically after a period of inactivity.'],
  ['02G · ĐẠT', '02G · PASS'],
  ['Bộ đếm hoạt động áp dụng toàn app. Khi ứng dụng chuyển nền, thời điểm hoạt động cuối vẫn được lưu để kiểm tra khi mở lại.', 'The inactivity timer applies across the app. When the app moves to the background, the last activity time is preserved and checked when the app becomes active again.'],
  ['phút', 'minutes'],
  ['phút.', 'minutes.'],
  ['Nút bên dưới gọi đúng đường logout của 02G ngay lập tức. Sau khi bấm, app phải trở về màn đăng nhập và hiển thị thông báo timeout. Bộ đếm thật trong ứng dụng vẫn giữ đúng', 'The button below immediately invokes the same 02G sign-out path. After you tap it, the app should return to the sign-in screen and show the inactivity message. The real app timer remains set to'],
  ['Đây là kiểm tra kỹ thuật của cơ chế phiên đăng nhập, không phải tuyên bố tuân thủ pháp lý hay chứng nhận bảo mật.', 'This is a technical check of session behavior, not a legal-compliance statement or security certification.'],
  ['Chạy quy trình kiểm tra để đào tạo hoặc trình diễn mà không lưu hồ sơ bệnh nhân, phiên kiểm tra, kết quả, dữ liệu theo dõi mắt hay ghi chú vào SQLite trên thiết bị.', 'Run the testing workflow for staff training or demonstration without saving patient records, test sessions, results, eye-tracking data, or notes to on-device SQLite.'],
  ['Tài khoản đã xác minh vẫn được dùng để mở ứng dụng, nhưng dữ liệu của lần chạy đào tạo chỉ tồn tại tạm thời trong bộ nhớ và sẽ không được lưu.', 'A verified account is still required to use the app, but training-run data exists only temporarily in memory and is not saved.'],
  ['Chế độ đào tạo dùng một ca riêng “', 'Training mode uses the dedicated case “'],
  ['”. Khi kết thúc, ứng dụng nhận diện ca này và không ghi dữ liệu vào cơ sở dữ liệu.', '”. The app recognizes this case and prevents it from being written to the database.'],
  ['FR-12 là ca ẩn danh thật và vẫn lưu dữ liệu trên thiết bị. FR-40 chỉ dùng cho đào tạo/trình diễn và không lưu kết quả bệnh nhân.', 'FR-12 is a real anonymous patient case and still stores data on the device. FR-40 is a training/demo sandbox and does not save patient results.'],
  ['Trạng thái đào tạo chỉ tồn tại tạm thời trong bộ nhớ. Nếu ứng dụng tải lại, lần chạy có thể được khởi tạo lại; tuy vậy mã ca đào tạo vẫn luôn bị chặn ở bước lưu nên không ghi dữ liệu xuống thiết bị.', 'Training state exists only in memory. If the app reloads, the run may be reset; however, the training case ID is always blocked at the persistence layer and cannot be written to the device.'],
  ['02A Firebase · ĐẠT', '02A Firebase · PASS'],
  ['02B Đăng ký + xác minh · ĐẠT', '02B Registration + verification · PASS'],
  ['02C Đăng nhập / đăng xuất / đặt lại mật khẩu · ĐẠT', '02C Sign in / sign out / password reset · PASS'],
  ['02D SQLite / AES / nhật ký hoạt động · ĐẠT', '02D SQLite / AES / Activity Log · PASS'],
  ['02E Hồ sơ bệnh nhân / tìm kiếm / lịch sử · ĐẠT', '02E Patient records / search / history · PASS'],
  ['02F Chế độ ẩn danh · ĐẠT', '02F Anonymous mode · PASS'],
  ['02G Tự động đăng xuất / ổn định bàn phím · ĐẠT', '02G Inactivity sign-out / keyboard stability · PASS'],
  ['02F Chế độ ẩn danh đã đạt kiểm tra trên thiết bị. 02G triển khai FR-06 tự động đăng xuất sau 15 phút không hoạt động và cải thiện thao tác bàn phím trên iOS để hạn chế giật hoặc cuộn quá mức ở cuối biểu mẫu.', '02F Anonymous Mode has passed on-device testing. 02G implements FR-06 inactivity sign-out after 15 minutes and improves iOS keyboard behavior to reduce layout jumps and overscrolling near the end of forms.'],
  ['Ứng dụng là công cụ hỗ trợ sàng lọc; kết quả không thay thế chẩn đoán hay đánh giá lâm sàng của chuyên gia.', 'This app supports screening only; its results do not replace diagnosis or clinical assessment by a qualified professional.'],
  ['Hồ sơ đã xóa', 'Deleted records'],
  ['Hồ sơ đã xóa có thể khôi phục trong thời hạn 30 ngày.', 'Deleted records can be restored for 30 days.'],
  ['Thùng hồ sơ', 'Deleted-record archive'],
  ['Hồ sơ đã xóa quá 30 ngày sẽ được xóa vĩnh viễn khi ứng dụng thực hiện bước dọn dữ liệu.', 'Records deleted more than 30 days ago are permanently removed during the app’s cleanup process.'],
  ['Đang kiểm tra hồ sơ đã xóa...', 'Checking deleted records...'],
  ['Không có hồ sơ nào đang chờ khôi phục.', 'There are no deleted records available for restoration.'],
  ['· còn khoảng', '· about'],
  ['ngày để khôi phục', 'days left to restore'],
  ['Quản trị viên có thể xem và chỉnh sửa hồ sơ bệnh nhân trong toàn bộ dữ liệu đang lưu trên thiết bị.', 'Administrators can view and edit all patient records stored on this device.'],
  ['Chuyên viên lâm sàng chỉ có thể xem và chỉnh sửa các hồ sơ được gắn với tài khoản của mình.', 'Clinicians can view and edit only patient records assigned to their own account.'],
  ['Kiểm tra mã hóa dữ liệu cục bộ', 'On-device data encryption check'],
  ['Chưa có kết quả.', 'No result is available yet.'],
  ['Milestone cuối của Technical Spike 01', 'Final milestone of Technical Spike 01'],
  ['01K chuyển tín hiệu 01J thành module dùng lại cho app thật: timestamp cùng epoch, polarity H/V, short-gap interpolation, smoothing nhẹ, lag/correlation, tracking-loss và trace đã xử lý.', '01K turns the 01J signal pipeline into a reusable app module: shared-epoch timestamps, H/V polarity, short-gap interpolation, light smoothing, lag/correlation, tracking-loss handling, and a processed trace.'],
  ['· chỉ di chuyển mắt', '· move the eyes only'],
  ['Giữ điện thoại cố định và giữ đầu thẳng. Engine sẽ chạy 10 giây ngang rồi 10 giây dọc và tạo trace chuẩn hóa.', 'Keep the phone steady and the head upright. The engine will run 10 seconds horizontally, then 10 seconds vertically, and produce a normalized trace.'],
  ['Ngang hoàn tất', 'Horizontal run complete'],
  ['Chuẩn bị theo chấm lên / xuống.', 'Prepare to follow the dot up and down.'],
  ['Đây là checkpoint đóng Technical Spike 01 trước khi sang Firebase/Auth/SQLite/Patient foundation.', 'This checkpoint closes Technical Spike 01 before moving on to the Firebase/Auth/SQLite/Patient foundation.'],
  ['CHẠY SIGNAL ENGINE H + V', 'RUN H + V SIGNAL ENGINE'],
  ['LÀM LẠI', 'RUN AGAIN'],
  ['01K là engineering acceptance, không phải clinical validation. Correlation/lag/quality gate ở đây chỉ quyết định pipeline có đủ ổn định để phát triển tiếp hay không. Pursuit gain lâm sàng chỉ được tính khi eye trace đã được calibration sang cùng đơn vị với stimulus/visual angle; vì vậy 01K cố tình không giả lập gain.', '01K is an engineering acceptance check, not clinical validation. The correlation, lag, and quality gates only determine whether the pipeline is stable enough for further development. Clinical pursuit gain should be calculated only after the eye trace is calibrated into the same units as the stimulus/visual angle, so 01K deliberately does not simulate gain.'],

  ['Bài 1 dùng quy trình đầy đủ. Bài 2–6 dùng quy trình nhanh 03L: hướng dẫn → hiệu chỉnh 5 điểm + ánh xạ/kiểm tra tự động → kích thích thị giác → chỉ số → lưu.', 'Test 1 uses the full setup. Tests 2–6 use the 03L quick workflow: instructions → five-point calibration + automatic mapping/check → visual stimulus → metrics → save.'],
  ['03L vẫn hiệu chỉnh trước từng bài theo FR-15 nhưng rút gọn bài 2–6 còn 5 điểm và gộp ánh xạ với kiểm tra điểm nhìn trong cùng một màn. Bộ 6 bài chỉ tổng hợp kết quả kỹ thuật, không tự chẩn đoán.', '03L still calibrates before every test under FR-15, but tests 2–6 use five points and combine gaze mapping with a gaze check on one screen. The six-test battery summarizes technical results only and does not diagnose automatically.'],
  ['Nếu bắt đầu bộ 6 bài mới từ bài 1, lần chạy đang dở trước đó sẽ được đóng ở trạng thái đã hủy để tránh trộn dữ liệu của hai lần chạy.', 'Starting a new six-test battery from test 1 closes any unfinished battery as canceled so data from different runs cannot be mixed.'],
  ['Thiết lập nhanh 03L chỉ dùng cho bài 2–6 trong bộ kiểm tra đầy đủ. Bài đầu vẫn dùng hiệu chỉnh 9 điểm, ánh xạ và kiểm định độc lập đầy đủ.', '03L quick setup is used only for tests 2–6 of the full battery. Test 1 still uses full nine-point calibration, gaze mapping, and independent validation.'],
  ['· bài trong bộ kiểm tra đầy đủ', '· test in the full battery'],
  ['Hiệu chỉnh 5 điểm + mô hình Ridge + 1 lần kiểm tra điểm nhìn trong cùng một màn', 'Five-point calibration + Ridge model + one gaze check on the same screen'],
  ['Bài 1 vẫn dùng quy trình đầy đủ 9 điểm. Từ bài 2–6, 03L vẫn thực hiện 5 điểm trước mỗi bài theo FR-15, nhưng tự tạo mô hình ánh xạ và kiểm tra kỹ thuật ngay trong cùng màn rồi chuyển thẳng sang kích thích thị giác.', 'Test 1 still uses the full nine-point workflow. For tests 2–6, 03L performs five-point calibration before each test under FR-15, builds the mapping model and technical check on the same screen, then proceeds directly to the visual stimulus.'],
  ['Chỉ di chuyển mắt theo chấm. Giữ đầu và điện thoại ổn định.', 'Follow the dot with the eyes only. Keep the head and phone steady.'],
  ['Đang mở kích thích thị giác...', 'Opening the visual stimulus...'],
  ['Dữ liệu theo dõi chưa đủ ổn định. Hãy thực hiện lại bước hiệu chỉnh nhanh.', 'Tracking is not stable enough yet. Repeat the quick-calibration step.'],
  ['Điểm hiệu chỉnh:', 'Calibration points:'],
  ['Sai số kiểm tra điểm nhìn:', 'Gaze-check error:'],
  ['03L chỉ tối ưu quy trình kỹ thuật, không thay đổi cách tính chỉ số, không tạo ngưỡng tham chiếu và không tự kết luận bệnh lý. Khi chạy một bài riêng lẻ, ứng dụng vẫn dùng quy trình hiệu chỉnh đầy đủ 9 điểm.', '03L streamlines the technical workflow only. It does not change metric calculations, create normative thresholds, or make clinical conclusions. Single-test runs continue to use the full nine-point calibration workflow.'],
  ['Tổng hợp sáu kết quả kỹ thuật đã lưu trong cùng một lần chạy. Không tạo phân loại chẩn đoán.', 'Summarize the six technical results saved within the same battery run. No diagnostic classification is generated.'],
  ['Hệ thống giữ đúng thứ tự Smooth Pursuit → H-Saccades → V-Saccades → Anti-Saccade → GEN → OKN và liên kết sáu phiên đã lưu. Convergence/NPC vẫn dùng quy trình FR-22 riêng, không nằm trong bộ 6 bài.', 'The app preserves the sequence Smooth Pursuit → H-Saccades → V-Saccades → Anti-Saccade → GEN → OKN and links all six saved sessions. Convergence/NPC remains a separate FR-22 workflow and is not part of the six-test battery.'],
  ['Các số liệu chính ở đây là tóm tắt chỉ số kỹ thuật của từng bài. 03K không áp ngưỡng tham chiếu, không gộp thành điểm chẩn đoán và không thay thế đánh giá của chuyên viên.', 'The values shown here summarize technical metrics for each test. 03K does not apply normative thresholds, combine them into a diagnostic score, or replace clinician assessment.'],
  ['Tổng kết bộ 6 bài được dựng lại từ dữ liệu các lần chạy và phiên kiểm tra đã mã hóa trong SQLite trên thiết bị; video camera gốc không được lưu.', 'The six-test summary is reconstructed from encrypted run and test-session data in on-device SQLite; raw camera video is not retained.'],
  ['Thông tin bệnh nhân hoặc bài kiểm tra không hợp lệ. Hãy quay lại hướng dẫn và thử lại.', 'Patient or test information is invalid. Return to the instructions and try again.'],
  ['· trước mỗi lần test', '· before each test'],
  ['Có điểm không đủ dữ liệu ổn định. Cố định đầu tốt hơn rồi chạy lại.', 'One or more points did not collect enough stable data. Hold the head steadier and recalibrate.'],
  ['LOOCV trung bình:', 'Mean LOOCV:'],
  ['% đường chéo màn hình', '% of screen diagonal'],
  ['Hiệu chỉnh:', 'Calibration:'],
  ['TIẾP TỤC KIỂM ĐỊNH · 03D', 'CONTINUE TO VALIDATION · 03D'],
  ['Quay lại 03C để tạo lại mô hình từ bộ dữ liệu hiệu chỉnh hiện tại.', 'Return to 03C to rebuild the model from the current calibration dataset.'],
  ['So sánh ba mô hình trên cùng bộ dữ liệu hiệu chỉnh 9 điểm bằng kiểm định leave-one-out.', 'Compare three models on the same nine-point calibration dataset using leave-one-out cross-validation.'],
  ['03C không dùng sai số trên dữ liệu huấn luyện để chọn mô hình. Mỗi điểm hiệu chỉnh lần lượt được giữ lại làm điểm kiểm định; mô hình được tạo từ 8 điểm còn lại rồi mới tính sai số.', '03C does not choose a model from training error. Each calibration point is held out in turn for validation; the model is fitted on the remaining eight points before error is calculated.'],
  ['Sai số LOOCV trung bình:', 'Mean LOOCV error:'],
  ['đơn vị chuẩn hóa ·', 'normalized units ·'],
  ['% đường chéo màn hình', '% of screen diagonal'],
  ['Trung bình:', 'Mean:'],
  ['% đường chéo · Lớn nhất:', '% diagonal · Maximum:'],
  ['Mô hình có sai số leave-one-out trung bình thấp nhất được chọn cho phiên hiện tại. Đây là kiểm tra kỹ thuật của ánh xạ, không phải ngưỡng chẩn đoán hoặc bằng chứng về độ chính xác lâm sàng.', 'The model with the lowest mean leave-one-out error is selected for the current session. This is a technical mapping check, not a diagnostic threshold or evidence of clinical accuracy.'],
  ['03C chưa chạy kích thích thị giác hoặc thu dữ liệu chuyển động mắt. Các chỉ số như gain của Smooth Pursuit, độ trễ Saccade và SPV chỉ được tính ở các bước sau.', '03C does not run the visual stimulus or capture the test eye trace. Metrics such as Smooth Pursuit gain, Saccade latency, and SPV are calculated in later steps.'],
  ['Cần đúng bộ dữ liệu hiệu chỉnh 9 điểm của bài kiểm tra hiện tại. Hãy quay lại hiệu chỉnh nếu dữ liệu đã mất sau khi ứng dụng tải lại.', 'The current test requires its own nine-point calibration dataset. Return to calibration if that data was lost after the app reloaded.'],
  ['03D sẽ dùng mô hình đã chọn để kiểm định một bộ điểm nhìn độc lập và kiểm tra chất lượng trước khi bắt đầu kích thích thị giác và ghi nhận dữ liệu.', '03D uses the selected model on an independent set of gaze points and checks technical quality before the visual stimulus and data capture begin.'],
  ['Dữ liệu theo dõi mắt 03E đã được chuyển thành các chỉ số kỹ thuật đầu tiên cho Smooth Pursuit.', '03E eye-tracking data has been converted into the first technical Smooth Pursuit metrics.'],
  ['Các bước sau mở rộng phép tính cho Horizontal/Vertical Saccades và Anti-Saccade: độ trễ, vận tốc đỉnh, độ chính xác, mức vượt mục tiêu và hướng đáp ứng. Ứng dụng vẫn không tự đặt ngưỡng lâm sàng.', 'Later steps extend the metric engine to Horizontal/Vertical Saccades and Anti-Saccade: latency, peak velocity, accuracy, overshoot, and response direction. The app still does not create its own clinical thresholds.'],
  ['Quay lại 03E và chạy lại Smooth Pursuit trước khi phân tích.', 'Return to 03E and rerun Smooth Pursuit before analysis.'],
  ['03F là bộ tính chỉ số kỹ thuật thử nghiệm cho quy trình sàng lọc, chưa phải kiểm định lâm sàng.', '03F is an experimental technical-metric engine for the screening workflow, not a clinically validated measurement system.'],
  ['Phân tích dữ liệu theo dõi mắt từ 03E bằng đơn vị màn hình chuẩn hóa. Chưa áp dụng ngưỡng để phân loại bình thường hoặc bất thường.', 'Analyze 03E eye-tracking data in normalized screen units. No threshold is applied to classify results as normal or abnormal.'],
  ['Hệ số dốc giữa vận tốc mắt và vận tốc mục tiêu sau khi làm mượt tín hiệu; không phải ngưỡng chẩn đoán.', 'Slope between eye velocity and target velocity after signal smoothing; this is not a diagnostic threshold.'],
  ['% mẫu ánh xạ đạt yêu cầu ·', '% valid mapped samples ·'],
  ['· cần chú ý', '· needs attention'],
  ['· không đạt', '· poor'],
  ['Tọa độ ngang của hướng nhìn và mục tiêu được làm mượt bằng trung bình trượt 3 mẫu. Vận tốc được tính theo dấu thời gian thực tế. Gain được ước lượng bằng hồi quy bình phương tối thiểu; các mẫu sát điểm đổi chiều, khi mục tiêu gần như đứng yên, được loại khỏi phép tính.', 'Horizontal gaze and target positions are smoothed with a three-sample moving average. Velocity is calculated from actual timestamps. Gain is estimated with least-squares regression; samples near direction reversals, when target velocity is close to zero, are excluded.'],
  ['03F hiện cần dữ liệu theo dõi mắt hoàn chỉnh của Smooth Pursuit từ 03E. Nếu dữ liệu tạm của phiên đã mất, hãy quay lại bước chạy bài kiểm tra.', '03F requires a complete Smooth Pursuit eye trace from 03E. If the temporary session data has been lost, return to the test-run step.'],
  ['Vận tốc ở 03F dùng đơn vị màn hình chuẩn hóa mỗi giây, chưa phải độ/giây (deg/s), vì quy trình Expo Go hiện chưa hiệu chỉnh đầy đủ khoảng cách và hình học quan sát thực tế.', '03F velocity uses normalized screen units per second rather than degrees per second (deg/s), because the current Expo Go workflow does not fully calibrate viewing distance and visual geometry.'],
  ['Đã có quy trình NPC gồm 3 lần đo BREAK/RECOVERY, kèm trung vị và khoảng giá trị. Khoảng cách do chuyên viên nhập trực tiếp. Chưa có đo khoảng cách tự động bằng TrueDepth và chưa áp dụng ngưỡng tham chiếu.', 'The NPC workflow now includes three BREAK/RECOVERY trials with median and range summaries. The clinician enters measured distances directly. Automatic TrueDepth distance measurement and normative thresholds are not included yet.'],
  ['LƯU TRIAL', 'SAVE TRIAL'],
  ['Khoảng cách BREAK trung vị ·', 'Median BREAK distance ·'],
  ['BẮT ĐẦU TRIAL', 'START TRIAL'],
  ['Expo Go tiêu chuẩn không cung cấp đường xử lý TrueDepth native để tự đo khoảng cách vật lý tới mũi. Vì vậy 03M hiện dùng quy trình có chuyên viên hỗ trợ và tính toán từ số đo nhập vào; chưa phải NPC TrueDepth tự động.', 'Standard Expo Go does not provide a native TrueDepth pipeline for automatic physical distance measurement to the nose. 03M therefore uses a clinician-assisted workflow based on entered measurements; it is not yet automatic TrueDepth NPC.'],
  ['Bộ tính chỉ số kỹ thuật cho hai bài nystagmus đã nhận dữ liệu theo dõi mắt từ 03E.', 'The technical metric engine for both nystagmus tests has received the 03E eye-tracking data.'],
  ['Bước tiếp theo hợp nhất kết quả của 6 bài kiểm tra, lưu phiên và tóm tắt chỉ số vào SQLite trên thiết bị, rồi liên kết với lịch sử bệnh nhân trước khi tạo báo cáo PDF.', 'The next step combines the six test results, saves sessions and metric summaries to on-device SQLite, and links them to patient history before PDF reporting.'],
  ['Hãy quay lại dữ liệu theo dõi mắt 03E của GEN/OKN và thực hiện lại bước phân tích 03H.', 'Return to the 03E eye-tracking data for GEN/OKN and repeat the 03H analysis.'],
  ['03H chỉ xác nhận quy trình xử lý tín hiệu kỹ thuật; kết quả chưa phải phép đo nystagmography đạt chuẩn lâm sàng.', '03H confirms the technical signal-processing workflow only; the result is not yet a clinically validated nystagmography measurement.'],
  ['Ước lượng vận tốc pha chậm và đáp ứng theo hướng từ dữ liệu theo dõi mắt 03E. Các giá trị dùng đơn vị màn hình chuẩn hóa, chưa phải độ/giây (deg/s) và không áp dụng ngưỡng chẩn đoán.', 'Estimate slow-phase velocity and directional responses from 03E eye-tracking data. Values use normalized screen units rather than degrees per second (deg/s), and no diagnostic thresholds are applied.'],
  ['Trung vị vận tốc ở các khoảng giữ mắt tại vị trí nhìn lệch, sau khi loại các giá trị vận tốc ngoại lệ về mặt kỹ thuật.', 'Median velocity during eccentric gaze-hold segments after technically implausible velocity outliers are removed.'],
  ['các điểm vận tốc được thuật toán nhận diện; chưa phải số nhịp đã được kiểm định', 'velocity events detected by the algorithm; not a validated beat count'],
  ['% mẫu ánh xạ đạt yêu cầu', '% valid mapped samples'],
  ['· pha nhanh tiềm năng', '· potential fast phases'],
  ['|SPV sang phải − SPV sang trái| / (SPV sang phải + SPV sang trái). Đây là ước lượng kỹ thuật đã chuẩn hóa, chưa phải ngưỡng tham chiếu của OKN.', '|rightward SPV − leftward SPV| / (rightward SPV + leftward SPV). This is a normalized technical estimate, not an OKN normative threshold.'],
  ['đoạn theo hướng · mức đồng thuận', 'directional segments · agreement'],
  ['các điểm vận tốc ngược hướng tiềm năng; chưa phải số nhịp đã được kiểm định', 'potential reverse-direction velocity events; not a validated beat count'],
  ['Dữ liệu theo dõi mắt chưa đủ hợp lệ cho GEN/OKN. Hãy quay lại 03E và thực hiện lại bài kiểm tra.', 'The eye-tracking data is not sufficient for GEN/OKN analysis. Return to 03E and repeat the test.'],
  ['GEN chia dữ liệu theo từng khoảng giữ mắt, bỏ phần chuyển vị đầu mỗi khoảng rồi dùng trung vị vận tốc để ước lượng pha chậm. OKN đổi hướng kích thích mỗi 5 giây, gom vận tốc mắt theo từng hướng và tính bất đối xứng. Các bước loại ngoại lệ chỉ phục vụ xử lý tín hiệu kỹ thuật.', 'GEN splits data into gaze-hold segments, removes the initial transition in each segment, and uses median velocity to estimate slow phase. OKN reverses stimulus direction every five seconds, groups eye velocity by direction, and calculates asymmetry. Outlier rejection is used only for technical signal processing.'],
  ['03H chưa có ngưỡng tham chiếu, không gắn nhãn bình thường/bất thường và không thay thế đánh giá lâm sàng. Vận tốc hiện dùng đơn vị màn hình chuẩn hóa mỗi giây, chưa phải độ/giây (deg/s).', '03H does not use normative thresholds, label results as normal/abnormal, or replace clinical assessment. Velocity currently uses normalized screen units per second rather than degrees per second (deg/s).'],
  ['03H là bước thử nghiệm xử lý tín hiệu trong Expo Go; chưa phải phép đo nystagmography đạt chuẩn lâm sàng.', '03H is an experimental signal-processing step in Expo Go, not a clinically validated nystagmography measurement.'],
  ['GIAI ĐOẠN 03B · XÁC NHẬN HOÀN TẤT', 'PHASE 03B · COMPLETION CHECK'],
  ['Hiệu chỉnh sẵn sàng', 'Calibration ready'],
  ['FR-15 được chạy ngay sau màn hướng dẫn và sử dụng hệ thống theo dõi trực tiếp trên thiết bị trong Expo Go.', 'FR-15 runs immediately after the instruction screen and uses the on-device tracking system in Expo Go.'],
  ['03A · FR-13 chọn một bài / bộ 6 bài', '03A · FR-13 single test / six-test battery selection'],
  ['03A · FR-14 hướng dẫn trước kiểm tra', '03A · FR-14 pre-test instructions'],
  ['03B · FR-15 hiệu chỉnh 9 điểm:', '03B · FR-15 nine-point calibration:'],
  ['Tiếp theo 03C · so sánh Ridge / Polynomial / KNN bằng kiểm định leave-one-out và chọn mô hình có sai số thấp nhất.', 'Next: 03C compares Ridge / Polynomial / KNN with leave-one-out validation and selects the model with the lowest error.'],
  ['Chưa bắt đầu recording', 'Recording has not started'],
  ['03B chỉ hoàn tất hiệu chỉnh kỹ thuật. Bước này không tạo video, chỉ số lâm sàng hoặc kết luận chẩn đoán.', '03B completes technical calibration only. This step does not create video, clinical metrics, or a diagnostic conclusion.'],
  ['TẠO ÁNH XẠ HƯỚNG NHÌN · 03C', 'BUILD GAZE MAPPING · 03C'],
  ['QUAY LẠI HIỆU CHỈNH', 'BACK TO CALIBRATION'],
  ['Bộ kiểm tra đầy đủ: bước', 'Full battery: step'],
  ['. Mỗi bài sẽ được hiệu chỉnh trước khi kích thích thị giác bắt đầu.', '. Each test is calibrated before the visual stimulus begins.'],
  ['Bộ dữ liệu hiệu chỉnh hiện được giữ trong bộ nhớ của phiên ứng dụng và sẽ được 03C dùng để tạo mô hình ánh xạ hướng nhìn.', 'The current calibration dataset is kept in app-session memory and will be used by 03C to build the gaze-mapping model.'],
  ['Phát lại chậm ước lượng hướng nhìn và vị trí mục tiêu từ dữ liệu đã lưu; không giữ video camera gốc.', 'Replay saved gaze estimates and target positions at a slower speed; raw camera video is not retained.'],
  ['khung phát lại từ', 'replay frames from'],
  ['mẫu theo dõi mắt đã mã hóa.', 'encrypted eye-tracking samples.'],
  ['Dữ liệu theo dõi mắt đã lưu nhưng không đủ tọa độ hướng nhìn để dựng phát lại.', 'Eye-tracking data was saved, but it does not contain enough gaze coordinates for replay.'],
  ['03O chỉ đọc dữ liệu theo dõi mắt đã mã hóa từ SQLite trên thiết bị. Ứng dụng không tạo tệp video, không ghi vào Ảnh và không tải dữ liệu lên đám mây. Phát lại video 240 fps gốc sẽ cần bản development build và camera native ở bước riêng.', '03O reads only encrypted eye-tracking data from on-device SQLite. The app does not create a video file, write to Photos, or upload data to the cloud. Native 240 fps video replay will require a development build and a native camera pipeline in a separate phase.'],
  ['FR-25 · FR-26 · FR-28 · FR-29 · dữ liệu được xử lý và lưu ưu tiên trên thiết bị.', 'FR-25 · FR-26 · FR-28 · FR-29 · data is processed and stored on-device first.'],
  ['ID bệnh nhân / ngày giờ / thiết bị / thời lượng kiểm tra / chỉ số / chất lượng theo dõi / dữ liệu vị trí mắt X-Y / ghi chú chuyên viên.', 'Patient ID / date and time / device / test duration / metrics / tracking quality / X-Y eye-position data / clinician note.'],
  ['Kích thích thị giác và thu dữ liệu mắt đã hoàn thành cho lần kiểm tra.', 'Visual stimulation and eye-data capture are complete for this test run.'],
  ['Chất lượng: tốt', 'Quality: good'],
  ['· trung bình', '· fair'],
  ['· kém', '· poor'],
  ['Tỷ lệ mẫu tốt:', 'Good-sample ratio:'],
  ['% · mô hình ánh xạ', '% · mapping model'],
  ['Đếm ngược, chạy kích thích thị giác, tạm dừng/hủy, chỉ báo chất lượng kỹ thuật và dữ liệu hướng nhìn có dấu thời gian đã được nối trong cùng một lần kiểm tra từ 03B đến 03D.', 'Countdown, visual stimulus, pause/cancel controls, technical quality indicators, and timestamped gaze data are connected within the same test context from 03B through 03D.'],
  ['Smooth Pursuit dùng bộ tính chỉ số 03F. Horizontal/Vertical Saccades và Anti-Saccade dùng 03G. Gaze-Evoked Nystagmus và OKN dùng bộ tính chỉ số 03H.', 'Smooth Pursuit uses the 03F metric engine. Horizontal/Vertical Saccades and Anti-Saccade use 03G. Gaze-Evoked Nystagmus and OKN use the 03H metric engine.'],
  ['Convergence / NPC tiếp tục dùng quy trình FR-22 riêng.', 'Convergence / NPC continues to use the separate FR-22 workflow.'],
  ['Quay lại bước ghi nhận và chạy lại bài kiểm tra.', 'Return to the capture step and repeat the test.'],
  ['03E hiện hỗ trợ bước chạy cho 6 bài trong bộ kiểm tra đầy đủ. Convergence / NPC tiếp tục dùng quy trình riêng theo FR-22.', '03E currently supports the six tests in the full battery. Convergence / NPC continues to use its separate FR-22 workflow.'],
  ['Đếm ngược 3 giây · kích thích thị giác · tạm dừng/hủy · chỉ báo chất lượng', '3-second countdown · visual stimulus · pause/cancel · quality indicator'],
  ['Chờ hệ thống theo dõi báo sẵn sàng. Sau khi bắt đầu, giữ đầu và điện thoại ổn định.', 'Wait until eye tracking is ready. After the test starts, keep the head and phone steady.'],
  ['Giữ đầu ở tư thế trung tâm', 'Keep the head centered'],
  ['Bộ đếm thời gian và kích thích thị giác đang tạm dừng.', 'The timer and visual stimulus are paused.'],
  ['Đã thu', 'Captured'],
  ['mẫu hợp lệ cho lần chạy này.', 'valid samples for this run.'],
  ['LƯU DỮ LIỆU MẮT · 03E SẴN SÀNG', 'SAVE EYE DATA · 03E READY'],
  ['Bước này xác nhận kích thích thị giác, đếm ngược, tạm dừng/hủy, chỉ báo chất lượng theo thời gian thực và thu dữ liệu mắt. Các chỉ số như gain của Smooth Pursuit, độ trễ Saccade và SPV được tính ở bước phân tích sau; ứng dụng chưa đưa ra kết luận lâm sàng.', 'This step confirms the visual stimulus, countdown, pause/cancel behavior, real-time quality indicator, and eye-data capture. Metrics such as Smooth Pursuit gain, Saccade latency, and SPV are calculated later; the app does not make a clinical conclusion here.'],
  ['Horizontal/Vertical Saccades và Anti-Saccade đã có bộ tính chỉ số kỹ thuật từ dữ liệu theo dõi mắt 03E.', 'Technical metrics for Horizontal/Vertical Saccades and Anti-Saccade are now available from the 03E eye-tracking data.'],
  ['độ trễ trung vị · đỉnh', 'median latency · peak'],
  ['Bước tiếp theo mở rộng bộ tính chỉ số cho Gaze-Evoked Nystagmus và OKN, sau đó hợp nhất kết quả cho toàn bộ bộ kiểm tra.', 'The next step extends the metric engine to Gaze-Evoked Nystagmus and OKN, then combines results for the full battery.'],
  ['Hãy quay lại dữ liệu theo dõi mắt 03E của bài kiểm tra và thực hiện lại bước phân tích 03G.', 'Return to the test’s 03E eye-tracking data and repeat the 03G analysis.'],
  ['03G là bước thử nghiệm tính chỉ số cho quy trình sàng lọc trong Expo Go; kết quả chưa phải phép đo đạt chuẩn lâm sàng.', '03G is an experimental metric-calculation step for the Expo Go screening workflow; its results are not yet clinically validated measurements.'],
  ['Ước lượng độ trễ, vận tốc đỉnh, độ chính xác/mức vượt mục tiêu và hướng đáp ứng từ dữ liệu theo dõi mắt 03E. Không áp dụng ngưỡng chẩn đoán.', 'Estimate latency, peak velocity, accuracy/overshoot, and response direction from 03E eye-tracking data. No diagnostic threshold is applied.'],
  ['Độ trễ kỹ thuật được tính từ lúc mục tiêu dự kiến đổi vị trí đến khi phát hiện đáp ứng mắt đầu tiên. Độ phân giải phụ thuộc tần số lấy mẫu của hệ thống theo dõi.', 'Technical latency is measured from the expected target transition to the first detected eye response. Resolution depends on the eye-tracking sample rate.'],
  ['sai số điểm cuối trung bình', 'mean endpoint error'],
  ['03G phát hiện các lần mục tiêu dự kiến đổi vị trí, lấy mốc trước mỗi lần chuyển, tìm đáp ứng mắt đầu tiên có thể phát hiện, tính vận tốc theo dấu thời gian và dùng phần cuối của mỗi lần cố định mắt để ước lượng điểm dừng. Các ngưỡng phát hiện chỉ phục vụ thuật toán và kiểm soát chất lượng kỹ thuật.', '03G detects expected target transitions, establishes a pre-transition baseline, finds the first detectable eye response, calculates timestamp-based velocity, and uses the end of each fixation to estimate the endpoint. Detection thresholds are used only for the algorithm and technical quality control.'],
  ['Ở Anti-Saccade, tín hiệu gợi ý và mục tiêu đáp ứng dự kiến nằm ở hai phía đối diện. Tỷ lệ hướng cho biết bao nhiêu đáp ứng đầu tiên đi đúng hướng Anti-Saccade dự kiến; đây chưa phải tỷ lệ lỗi lâm sàng đã chuẩn hóa theo dữ liệu tham chiếu.', 'For Anti-Saccade, the cue and expected response are on opposite sides. The direction ratio reports how many first responses move in the expected anti-saccade direction; it is not a clinically normalized error rate.'],
  ['03G chỉ tạo các chỉ số thử nghiệm từ dữ liệu hướng nhìn trong Expo Go. Độ trễ và vận tốc hiện chưa phải phép đo đạt chuẩn lâm sàng, đồng thời chưa dùng ngưỡng tham chiếu để gắn nhãn bình thường/bất thường.', '03G produces experimental metrics from gaze data in Expo Go. Latency and velocity are not yet clinically validated measurements, and no normative threshold is used to label results normal or abnormal.'],
  ['03G cần một trace hoàn chỉnh của Horizontal Saccades, Vertical Saccades hoặc Anti-Saccade từ 03E.', '03G requires a complete 03E trace from Horizontal Saccades, Vertical Saccades, or Anti-Saccade.'],
  ['Vận tốc dùng đơn vị màn hình chuẩn hóa mỗi giây, chưa phải độ/giây (deg/s). Độ trễ chịu giới hạn bởi tần số lấy mẫu thực tế của bộ theo dõi WebView/MediaPipe.', 'Velocity uses normalized screen units per second rather than degrees per second (deg/s). Latency resolution is limited by the actual WebView/MediaPipe tracking sample rate.'],
  ['Đọc lại kết quả kỹ thuật đã mã hóa và lưu trên thiết bị.', 'Review the encrypted technical result saved on this device.'],
  ['Hoàn tất:', 'Completed:'],
  ['Đây là kết quả kỹ thuật đã lưu để chuyên viên xem lại. Bước này chưa áp ngưỡng tham chiếu, chưa gắn nhãn bình thường/bất thường và không phân loại chẩn đoán.', 'This saved technical result is provided for clinician review. No normative threshold, normal/abnormal label, or diagnostic classification is applied.'],
  ['Dữ liệu phiên được đọc từ SQLite trên thiết bị. 03J tạo PDF; 03N so sánh theo thời gian; 03O phát lại dữ liệu mắt đã xử lý. Video camera gốc không được lưu dài hạn.', 'Session data is read from on-device SQLite. 03J creates the PDF report, 03N provides longitudinal comparison, and 03O replays processed eye-tracking data. Raw camera video is not retained long term.'],
  ['Kết quả kỹ thuật đào tạo · không áp ngưỡng tham chiếu · không chẩn đoán', 'Training technical result · no normative threshold · no diagnosis'],
  ['Lần chạy này không ghi phiên kiểm tra hoặc bộ 6 bài vào cơ sở dữ liệu. Dữ liệu mắt và chỉ số chỉ tồn tại tạm thời, không xuất hiện trong lịch sử bệnh nhân, biểu đồ theo thời gian, báo cáo PDF hoặc Nhật ký hoạt động.', 'This run does not write a test session or six-test battery to the database. Eye data and metrics exist only temporarily and do not appear in patient history, longitudinal charts, PDF reports, or the Activity Log.'],
  ['Kết quả kỹ thuật tổng hợp · không tự gán bình thường/bất thường', 'Combined technical result · no automatic normal/abnormal label'],
  ['Phiên kiểm tra, kết quả và dữ liệu theo dõi mắt đã được ghi vào cơ sở dữ liệu trên thiết bị. Tóm tắt chỉ số và dữ liệu theo dõi mắt được mã hóa trước khi lưu; lịch sử bệnh nhân đọc trực tiếp từ các phiên đã lưu.', 'The test session, result, and eye-tracking data have been written to the on-device database. Metric summaries and eye-tracking data are encrypted before storage; patient history is built directly from saved sessions.'],
  ['cũ nhất', 'oldest'],
  ['Theo dõi cùng một chỉ số kỹ thuật qua nhiều lần kiểm tra đã lưu của cùng bệnh nhân.', 'Track the same technical metric across multiple saved sessions for the same patient.'],
  ['loại test có dữ liệu ·', 'test types with data ·'],
  ['loại đủ ≥2 lần để vẽ so sánh.', 'with at least two sessions available for comparison.'],
  ['phiên · từ', 'sessions · from'],
  ['đến', 'to'],
  ['Biểu đồ tự điều chỉnh thang đo theo các lần đo của bài kiểm tra này. Giá trị gốc vẫn hiển thị bên dưới.', 'The chart automatically scales to the measurements for this test. Original values remain listed below.'],
  ['Các phiên của', 'Sessions for'],
  ['hiện mới có', 'currently has only'],
  ['phiên có kết quả kỹ thuật. Cần ít nhất 2 lần đã lưu để vẽ so sánh FR-27.', 'sessions with technical results. At least two saved sessions are required for FR-27 comparison.'],
  ['Hoàn tất và lưu ít nhất hai lần cùng một bài kiểm tra. 03N sẽ đọc dữ liệu đã mã hóa từ SQLite trên thiết bị và tạo biểu đồ theo thời gian.', 'Complete and save the same test at least twice. 03N reads the encrypted on-device SQLite data and creates a longitudinal chart.'],
  ['Dữ liệu FR-27 được đọc từ các phiên và kết quả đã mã hóa trên thiết bị. Không tải dữ liệu lên đám mây và không dùng cơ sở dữ liệu tham chiếu ở bước này.', 'FR-27 reads encrypted on-device sessions and results. Data is not uploaded to the cloud, and no normative database is used at this step.'],
  ['Mô hình ánh xạ:', 'Mapping model:'],
  ['5/5 điểm nhìn · sai số trung bình', '5/5 gaze points · mean error'],
  ['chuẩn hóa ·', 'normalized ·'],
  ['· mẫu được chấp nhận', '· accepted samples'],
  ['Chạy đếm ngược 3 giây, kích thích thị giác, lấy mẫu dữ liệu mắt, tạm dừng/hủy và hiển thị chất lượng kỹ thuật theo thời gian thực.', 'Run a three-second countdown, visual stimulus, eye-data sampling, pause/cancel controls, and real-time technical quality display.'],
  ['TIẾP TỤC KÍCH THÍCH + THEO DÕI MẮT · 03E', 'CONTINUE TO STIMULUS + EYE TRACKING · 03E'],
  ['Convergence / NPC không thuộc quy trình chạy 6 bài ở 03E và tiếp tục dùng luồng FR-22 riêng.', 'Convergence / NPC is not part of the six-test 03E workflow and continues to use the separate FR-22 flow.'],
  ['Quay lại 03D và chạy lại kiểm định điểm nhìn độc lập.', 'Return to 03D and repeat the independent gaze validation.'],
  ['03D cần dữ liệu hiệu chỉnh 03B và mô hình ánh xạ 03C của phiên hiện tại.', '03D requires the current session’s 03B calibration data and 03C mapping model.'],
  ['· 5 điểm không trùng bộ 9 điểm hiệu chỉnh', '· five points separate from the nine calibration points'],
  ['Nhìn lần lượt 5 chấm kiểm tra mới. 03D dùng hệ thống theo dõi trên thiết bị và mô hình ánh xạ đã chọn ở 03C để đo sai số ngoài bộ 9 điểm hiệu chỉnh.', 'Look at five new validation dots in sequence. 03D uses on-device tracking and the mapping model selected in 03C to measure error outside the nine calibration points.'],
  ['Chỉ di chuyển mắt theo chấm. Không xoay đầu theo mục tiêu.', 'Follow the dot with the eyes only. Do not turn the head toward the target.'],
  ['Đã thu xong bộ điểm kiểm định độc lập.', 'Independent validation points have been collected.'],
  ['Chưa đủ mẫu kỹ thuật ổn định.', 'Not enough technically stable samples yet.'],
  ['· Mốc đầu:', '· Head baseline:'],
  ['Sai số trung bình độc lập:', 'Independent mean error:'],
  ['· mẫu được chấp nhận:', '· accepted samples:'],
  ['XÁC NHẬN KIỂM ĐỊNH · 03D SẴN SÀNG', 'CONFIRM VALIDATION · 03D READY'],
  ['mục tiêu (', 'target ('],
  ['% đường chéo màn hình · samples', '% of screen diagonal · samples'],
  ['Sai số fixation ở đây là phép kiểm tra kỹ thuật độc lập. 03D không gắn nhãn bình thường/bất thường và không tạo kết luận lâm sàng.', 'Fixation error here is an independent technical check. 03D does not assign normal/abnormal labels or generate a clinical conclusion.'],
  ['Bước kiểm soát chất lượng 03D chỉ kiểm tra việc thu đủ mẫu khi theo dõi khuôn mặt và tư thế đầu ổn định, cùng tốc độ FPS kỹ thuật. Sai số điểm nhìn không được dùng làm ngưỡng chẩn đoán.', 'The 03D quality-control step checks only that enough samples were captured with stable face tracking, head pose, and technical FPS. Gaze error is not used as a diagnostic threshold.'],
  ['→ → →   sau đó   ← ← ←', '→ → →   then   ← ← ←'],
  ['Sai số lớn nhất ở điểm kiểm tra:', 'Maximum error at validation point:'],
  ['→ → → sau đó ← ← ←', '→ → → then ← ← ←'],
  ['Test 2–6 dùng quick calibration 5 điểm 03L.', 'Tests 2–6 use the 03L five-point quick calibration.'],
  ['FR-22 · quy trình NPC', 'FR-22 · NPC protocol'],
];

extendedPairs.forEach(([vi, en]) => addPair(vi, en));

function direct(language: AppLanguage, text: string) {
  return language === 'en' ? maps.viToEn.get(text) : maps.enToVi.get(text);
}

const fragmentPairs: Array<[string, string]> = [
  ['Khuôn mặt:', 'Face:'],
  ['Mốc tư thế đầu:', 'Head baseline:'],
  ['Tài nguyên trên thiết bị:', 'On-device resources:'],
  ['Tốc độ theo dõi (FPS):', 'Tracking rate (FPS):'],
  ['Điểm đã lưu:', 'Saved points:'],
  ['Hồ sơ/ca:', 'Patient/case:'],
  ['Hồ sơ / ca:', 'Patient / case:'],
  ['Tín hiệu tốt', 'Good signal'],
  ['tín hiệu tốt', 'good signal'],
  ['ký tự', 'characters'],
  ['CHƯA ĐẠT', 'NOT PASSED'],
  ['ĐẠT', 'PASS'],
  ['CHƯA NHẬN DIỆN', 'NOT DETECTED'],
];

function applyFragments(language: AppLanguage, text: string): string {
  const pairs = language === 'en'
    ? fragmentPairs
    : fragmentPairs.map(([vi, en]) => [en, vi] as [string, string]);
  let result = text;
  for (const [from, to] of pairs) result = result.split(from).join(to);
  return result;
}

function dynamicViToEn(text: string): string {
  const rules: Array<[RegExp, (...args: string[]) => string]> = [
    [/^Phiên đã được khôi phục cho (.+)\.$/, (_m, who) => `Session restored for ${who}.`],
    [/^Nhìn vào điểm (\d+)\/9 · giữ đầu yên$/, (_m, n) => `Look at point ${n}/9 · keep your head still`],
    [/^Điểm (\d+): dữ liệu chưa ổn định · tự thử lại$/, (_m, n) => `Point ${n}: data is not stable yet · retrying automatically`],
    [/^Điểm (\d+)\/9 · đang lấy mẫu \((\d+)\)$/, (_m, n, count) => `Point ${n}/9 · collecting samples (${count})`],
    [/^Điểm (\d+)\/9 đã lưu$/, (_m, n) => `Point ${n}/9 saved`],
    [/^Điểm (\d+)\/9 không đủ sample ổn định\. Giữ điện thoại và đầu cố định hơn rồi chạy lại calibration\.$/, (_m, n) => `Point ${n}/9 did not collect enough stable samples. Keep the phone and the patient’s head steadier, then recalibrate.`],
    [/^Quick calibration (\d+)\/5 · giữ đầu yên$/, (_m, n) => `Quick calibration ${n}/5 · keep your head still`],
    [/^Điểm (\d+)\/5 chưa ổn định · tự thử lại$/, (_m, n) => `Point ${n}/5 is not stable yet · retrying automatically`],
    [/^Điểm (\d+)\/5 đã lưu$/, (_m, n) => `Point ${n}/5 saved`],
    [/^Điểm (\d+)\/5 không đủ sample ổn định\. Giữ đầu và điện thoại cố định hơn rồi chạy lại quick setup\.$/, (_m, n) => `Point ${n}/5 did not collect enough stable samples. Keep the head and phone steadier, then repeat quick setup.`],
    [/^Validation (\d+)\/(\d+) · chỉ di chuyển mắt$/, (_m, n, total) => `Validation ${n}/${total} · move the eyes only`],
    [/^Điểm (\d+): chưa đủ sample ổn định · tự thử lại$/, (_m, n) => `Point ${n}: stable samples are not sufficient yet · retrying automatically`],
    [/^Điểm (\d+)\/(\d+) · accepted (\d+)\/(\d+)$/, (_m, n, total, accepted, raw) => `Point ${n}/${total} · accepted ${accepted}/${raw}`],
    [/^Validation point (\d+)\/(\d+) không đủ sample kỹ thuật\. Giữ đầu và điện thoại cố định hơn rồi chạy lại\.$/, (_m, n, total) => `Validation point ${n}/${total} did not collect enough technically valid samples. Keep the head and phone steadier, then run validation again.`],
    [/^Tiếp theo: (.+)$/, (_m, value) => `Next: ${value}`],
    [/^MỞ TEST (\d+)\/6 · QUICK FLOW 03L$/, (_m, n) => `OPEN TEST ${n}/6 · 03L QUICK FLOW`],
    [/^Hồ sơ\/ca: (.+)$/, (_m, value) => `Patient/case: ${value}`],
    [/^Đã ghi nhận (\d+)\/(\d+) test trong battery run (.+)\.$/, (_m, done, total, id) => `Recorded ${done}/${total} tests in battery run ${id}.`],
    [/^Đã hoàn tất test (\d+)\/6 trong memory\. Test kế tiếp: (.+)\.$/, (_m, n, next) => `Training test ${n}/6 completed in memory. Next test: ${next}.`],
    [/^BẮT ĐẦU · (\d+) GIÂY$/, (_m, sec) => `START · ${sec} SEC`],
    [/^(\d+(?:\.\d+)?) giây$/, (_m, sec) => `${sec} sec`],
    [/^Đây là bài (\d+)\/6\. (.+)$/, (_m, n, rest) => `This is test ${n}/6. ${translateUiText('en', rest)}`],
    [/^Full battery: test (\d+)\/(\d+)\. 03D chạy quality validation riêng cho từng test\.$/, (_m, n, total) => `Full battery: test ${n}/${total}. 03D runs an independent quality validation for each test.`],
    [/^Full battery: test (\d+)\/(\d+)\. 03E giữ nguyên battery context\.$/, (_m, n, total) => `Full battery: test ${n}/${total}. 03E keeps the current battery context.`],
    [/^(.+) · (\d+)\/9 điểm$/, (_m, id, count) => `${id} · ${count}/9 points`],
    [/^(\d+)\/9 điểm · (\d+)\/(\d+) samples$/, (_m, points, accepted, raw) => `${points}/9 points · ${accepted}/${raw} samples`],
    [/^TIẾP TỤC TRAINING TEST (\d+)\/6 · (.+)$/, (_m, n, name) => `CONTINUE TRAINING TEST ${n}/6 · ${name}`],
    [/^TIẾP TỤC TEST (\d+)\/6 · (.+)$/, (_m, n, name) => `CONTINUE TEST ${n}/6 · ${name}`],
    [/^(.+) · bài trong bộ kiểm tra đầy đủ (\d+)\/6$/, (_m, name, n) => `${name} · full-battery test ${n}/6`],
    [/^(.+) · 5 điểm không trùng bộ 9 điểm hiệu chỉnh$/, (_m, name) => `${name} · five points separate from the nine calibration points`],
    [/^(.+) · (\d+)\/(\d+) điểm$/, (_m, id, count, total) => `${id} · ${count}/${total} points`],
    [/^Không xác định được Metro origin từ URI: (.+)$/, (_m, uri) => `Metro origin could not be determined from URI: ${uri}`],
  ];
  for (const [pattern, render] of rules) {
    const match = text.match(pattern);
    if (match) return render(...match);
  }
  return text;
}


function polishFinalUiText(language: AppLanguage, text: string): string {
  if (!text) return text;

  // Preserve code-like identifiers and generated IDs.
  if (/^[A-Z0-9][A-Z0-9._:@/-]{7,}$/.test(text.trim())) {
    return text;
  }

  let out = text;

  out = out
    .replace(/\b(?:GIAI ĐOẠN|PHASE)\s+[0-9A-Z/.-]+\s*(?:·|-)?\s*/gi, '')
    .replace(/\bFR-\d+(?:\/\d+)*\b\s*(?:·|-|:)?\s*/gi, '')
    .replace(/\b0[1-9][A-Z]\d?(?:\/0[1-9][A-Z]\d?)+\b\s*(?:·|-)?\s*/g, '')
    .replace(/\b0[1-9][A-Z]\d?\b\s*(?:·|-)?\s*/g, '')
    .replace(/^\s*\/\d+\s*(?:·|-|:)?\s*/g, '')
    .replace(/\s*·\s*·\s*/g, ' · ')
    .replace(/^\s*·\s*/, '')
    .replace(/\s*·\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (language === 'vi') {
    out = out
      .replace(/SQLite/gi, 'bộ nhớ thiết bị')
      .replace(/AES-256-GCM|AES-256/gi, 'mã hóa')
      .replace(/Expo Go/gi, 'ứng dụng')
      .replace(/pipeline camera smartphone/gi, 'hệ thống camera hiện tại')
      .replace(/pipeline camera/gi, 'hệ thống camera')
      .replace(/tóm tắt chỉ số kỹ thuật/gi, 'tóm tắt kết quả')
      .replace(/tóm tắt kỹ thuật/gi, 'tóm tắt kết quả')
      .replace(/kết quả kỹ thuật/gi, 'kết quả')
      .replace(/chỉ số kỹ thuật/gi, 'chỉ số')
      .replace(/kiểm tra kỹ thuật/gi, 'kiểm tra')
      .replace(/FPS kỹ thuật/gi, 'FPS')
      .replace(/Phạm vi đạt của\s*/gi, 'Thông tin ')
      .replace(/Tiếp theo\s*$/gi, 'Bước tiếp theo')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } else {
    out = out
      .replace(/SQLite/gi, 'on-device storage')
      .replace(/AES-256-GCM|AES-256/gi, 'encrypted')
      .replace(/Expo Go/gi, 'the app')
      .replace(/smartphone camera pipeline/gi, 'current camera system')
      .replace(/technical metric/gi, 'metric')
      .replace(/technical result/gi, 'result')
      .replace(/technical summary/gi, 'result summary')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  const lower = out.toLowerCase();

  if (
    /camera\s*:/.test(lower) &&
    (lower.includes('mediapipe') || lower.includes('khuôn mặt') || lower.includes('face'))
  ) {
    const ready =
      !lower.includes('lỗi') &&
      !lower.includes('error') &&
      !lower.includes('chưa nhận') &&
      !lower.includes('không');
    return language === 'vi'
      ? `Hệ thống theo dõi: ${ready ? 'Sẵn sàng' : 'Đang chuẩn bị'}`
      : `Tracking system: ${ready ? 'Ready' : 'Preparing'}`;
  }

  if (/^hồ sơ\s*\/?\s*ca\s*:/i.test(out) || /^patient\s*\/?\s*case\s*:/i.test(out)) {
    return language === 'vi' ? 'Hồ sơ hiện tại' : 'Current patient';
  }

  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(out)) {
    return language === 'vi' ? 'Hồ sơ hiện tại' : 'Current patient';
  }

  if (/^(CAL|MAP|TRACE|VALIDATION|VAL)-[A-Z0-9_-]+/i.test(out)) {
    const pointMatch = out.match(/(\d+)\/(\d+)\s*điểm/i);
    if (language === 'vi') {
      return pointMatch
        ? `${pointMatch[1]}/${pointMatch[2]} điểm đã ghi nhận`
        : 'Dữ liệu phiên hiện tại';
    }
    return pointMatch
      ? `${pointMatch[1]}/${pointMatch[2]} points captured`
      : 'Current session data';
  }

  if (
    lower.includes('secure context') ||
    lower.includes('(simd)') ||
    lower.includes('mapping id') ||
    lower.includes('eye span')
  ) {
    return language === 'vi' ? 'Hệ thống đã sẵn sàng' : 'System ready';
  }

  if (
    lower.includes('loocv') ||
    lower.includes('leave-one-out') ||
    lower.includes('ridge linear') ||
    lower.includes('polynomial') ||
    lower.includes('knn')
  ) {
    return language === 'vi'
      ? 'Hiệu chỉnh đã được xử lý tự động.'
      : 'Calibration was processed automatically.';
  }

  return out;
}

function translateUiTextRaw(language: AppLanguage, text: string): string {
  if (!text || !text.trim()) return text;

  const directMatch = direct(language, text);
  if (directMatch) return directMatch;

  // Preserve surrounding whitespace while translating only the visible content.
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const core = text.slice(leading.length, text.length - trailing.length);
  const coreMatch = direct(language, core);
  if (coreMatch) return `${leading}${coreMatch}${trailing}`;

  if (language === 'en') {
    // Dynamic strings must be translated before fragment-level rules mutate them.
    const dynamic = dynamicViToEn(core);
    if (dynamic !== core) return `${leading}${dynamic}${trailing}`;

    // Some pipeline strings contain several child fragments. Compose pipeline and
    // global fragment translation instead of returning after the first partial hit.
    let translated = translatePipelineText(language, core);
    translated = applyFragments(language, translated);
    const afterDirect = direct(language, translated);
    if (afterDirect) translated = afterDirect;
    return `${leading}${translated}${trailing}`;
  }

  let translated = translatePipelineText(language, core);
  translated = applyFragments(language, translated);
  const afterDirect = direct(language, translated);
  if (afterDirect) translated = afterDirect;
  return `${leading}${translated}${trailing}`;
}


export function translateUiText(language: AppLanguage, text: string): string {
  return polishFinalUiText(language, translateUiTextRaw(language, text));
}
