import { FileUp, LockKeyhole } from "lucide-react";

export default function DropOverlay({ onChoose }) {
  return (
    <div className="drop-overlay">
      <div className="drop-panel">
        <div className="drop-icon">
          <FileUp size={30} />
        </div>
        <h2>放开以查看轨迹</h2>
        <p>支持 ATIF JSON、JSONL 与多轨迹文件包</p>
        <button type="button" className="secondary-button" onClick={onChoose}>
          或选择文件
        </button>
        <span className="drop-privacy">
          <LockKeyhole size={13} />
          不会上传到服务器
        </span>
      </div>
    </div>
  );
}
