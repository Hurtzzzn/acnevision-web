import { COPY } from '@acnevision/shared';
import { LockedPreview } from '../LockedPreview';

/** "After you sign in" teaser: the shared locked preview (blurred sample Grad-CAM, locked numbers), same as the guest UpgradeCard. Decorative. */
export function MemberPreview() {
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-white p-5 text-ink-600 shadow-float" aria-hidden>
      <p className="text-label-md text-ink-900">{COPY.home.preview.memberPreviewTitle}</p>
      <div className="mt-4 flex flex-1 flex-col justify-center">
        <LockedPreview side />
      </div>
    </div>
  );
}
