import { useParams } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import PostUtilityBar from '@/components/board/PostUtilityBar'
import { getEventPhotoPost, getRelatedEventPhotoPosts } from '@/data/eventPhotos'

const LIST_PATH = '/church-news/album'

function EventPhotoDetail() {
  const { postId } = useParams()
  const post = getEventPhotoPost(postId)
  const relatedPosts = getRelatedEventPhotoPosts(postId)

  return (
    <>
      <BoardPostDetail
        pageTitle="교회앨범"
        pageDescription="교회 행사와 다양한 활동 사진을 소개합니다."
        listPath={LIST_PATH}
        detailPathPrefix={LIST_PATH}
        postType="album"
        post={post}
        relatedPosts={relatedPosts}
        ariaLabel="교회앨범 상세"
        listButtonLabel="목록"
      >
        {post?.images?.length > 0 && (
          <div className="church-news-detail__images">
            {post.images.map((image, index) => (
              <figure key={`${post.id}-image-${index}`} className="church-news-detail__figure">
                <img
                  src={image.src}
                  alt={image.alt || `${post.title} 사진 ${index + 1}`}
                  className="church-news-detail__image"
                />
              </figure>
            ))}
          </div>
        )}
      </BoardPostDetail>
      {post && <PostUtilityBar />}
    </>
  )
}

export default EventPhotoDetail
