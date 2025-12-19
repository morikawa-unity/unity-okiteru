/**
 * ホームページ（ダッシュボード統合版）
 * Next.js のルーティング用エントリーポイント
 * 勤怠報告・出社可能日・日報管理を統合した画面
 */
import { HomeContainer } from '@/containers/home/HomeContainer';

export default function HomePage() {
  return <HomeContainer />;
}
