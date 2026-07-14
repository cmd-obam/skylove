import { useParams } from 'react-router-dom'
import WorshipWordWrite from '@/pages/worshipWord/WorshipWordWrite'

function SundayWorshipEdit() {
  const { postId } = useParams()
  return <WorshipWordWrite boardKey="sunday" mode="edit" postId={postId} />
}

export default SundayWorshipEdit
