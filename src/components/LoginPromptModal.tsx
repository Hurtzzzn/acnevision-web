import { Link } from 'react-router-dom';
import { useUi } from '../store/ui';
import { Modal } from './ui';

/** Single modal used for every guest gate (save, history, chat). Mounted once in the layout. */
export function LoginPromptModal() {
  const { loginPrompt, closeLoginPrompt } = useUi();
  if (!loginPrompt) return null;
  const q = `?redirectTo=${encodeURIComponent(loginPrompt.redirectTo)}`;
  return (
    <Modal title="Masuk diperlukan" onClose={closeLoginPrompt}>
      <p className="mb-5 text-sm">{loginPrompt.message}</p>
      <div className="flex gap-3">
        <Link to={`/login${q}`} className="btn-primary flex-1" onClick={closeLoginPrompt}>Masuk</Link>
        <Link to={`/register${q}`} className="btn-outline flex-1" onClick={closeLoginPrompt}>Daftar</Link>
      </div>
    </Modal>
  );
}
