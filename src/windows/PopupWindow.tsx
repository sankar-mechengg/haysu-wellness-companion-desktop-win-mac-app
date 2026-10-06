import PopupHost from "../components/popup/PopupHost";
import { useCareSync } from "../hooks/useCare";

export default function PopupWindow() {
  useCareSync();
  return <PopupHost />;
}
