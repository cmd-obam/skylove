import { useParams } from 'react-router-dom'
import WorshipWordWrite from '@/pages/worshipWord/WorshipWordWrite'

function ElShaddaiEdit() {
  const { postId } = useParams()
  return <WorshipWordWrite boardKey="el-shaddai" mode="edit" postId={postId} />
}

export default ElShaddaiEdit
