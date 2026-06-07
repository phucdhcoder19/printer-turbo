import { useEffect, useRef, useState } from 'react';
import { videoApi, type TaskResponse } from '../../lib/api';

/**
 * Tạo Video: gửi chủ đề → NestJS proxy sang FastAPI → nhận task_id →
 * poll trạng thái mỗi 2 giây cho tới khi xong/lỗi.
 */
export function CreateVideoPage() {
  const [topic, setTopic] = useState('');
  const [aspect, setAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [subtitle, setSubtitle] = useState(true);
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dọn interval khi rời trang
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTask(null);
    stopPolling();

    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề!');
      return;
    }

    try {
      const created = await videoApi.create({
        topic,
        video_aspect: aspect,
        subtitle_enabled: subtitle,
      });
      setTask(created);

      // Bắt đầu poll tiến độ
      pollRef.current = setInterval(async () => {
        try {
          const t = await videoApi.getTask(created.task_id);
          setTask(t);
          if (t.state === 'complete' || t.state === 'failed') stopPolling();
        } catch {
          /* lỗi tạm thời khi poll → bỏ qua, thử lại lần sau */
        }
      }, 2000);
    } catch (err: unknown) {
      setError(
        'Không tạo được video. Kiểm tra NestJS + FastAPI đã chạy chưa.',
      );
      console.error(err);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🎥 Tạo Video</h1>
      <p className="text-slate-500 mb-6">
        Nhập chủ đề, hệ thống tự sinh kịch bản → giọng đọc → phụ đề → ghép video.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Chủ đề video</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Cà phê Việt Nam"
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Tỉ lệ</label>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as typeof aspect)}
              className="w-full border border-slate-300 rounded-md px-3 py-2"
            >
              <option value="9:16">9:16 (Dọc)</option>
              <option value="16:9">16:9 (Ngang)</option>
              <option value="1:1">1:1 (Vuông)</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={subtitle}
              onChange={(e) => setSubtitle(e.target.checked)}
            />
            <span className="text-sm">Hiện phụ đề</span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-indigo-600 text-white px-5 py-2 rounded-md font-medium hover:bg-indigo-700"
        >
          🚀 Tạo Video
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      {task && <ProgressCard task={task} />}
    </div>
  );
}

function ProgressCard({ task }: { task: TaskResponse }) {
  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium">Task: {task.task_id}</span>
        <span className="text-slate-500">{task.state}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all"
          style={{ width: `${task.progress}%` }}
        />
      </div>
      {task.message && (
        <p className="text-sm text-slate-600 mt-2">{task.message}</p>
      )}
      {task.state === 'complete' && task.videos?.[0] && (
        <p className="text-sm text-green-700 mt-3">
          ✅ Xong: {task.videos[0]}
        </p>
      )}
    </div>
  );
}
