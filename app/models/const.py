# app/models/const.py
#
# TẠI SAO dùng hằng số thay vì string trực tiếp?
# → Viết "proessing" (typo) thay vì "processing" → bug âm thầm
# → Dùng TASK_STATE_PROCESSING → nếu typo, Python báo NameError ngay
# → Tìm kiếm tất cả chỗ dùng state = 1 lệnh grep

TASK_STATE_PROCESSING = "processing"
TASK_STATE_COMPLETE = "complete"
TASK_STATE_FAILED = "failed"
