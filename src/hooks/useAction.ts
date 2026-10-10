import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { useToast } from '../components/toast'

/**
 * 서버를 바꾸는 동작. 실패하면 서버가 준 메시지를 토스트로 보여 준다.
 * 409 CONCURRENT_MODIFICATION이면 다른 사람이 먼저 고친 것이라 화면 데이터를 새로 읽는다.
 */
export function useAction<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  options: { onSuccess?: (result: TResult, args: TArgs) => void; successMessage?: string } = {},
) {
  const toast = useToast()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, args) => {
      if (options.successMessage) toast(options.successMessage, 'success')
      options.onSuccess?.(result, args)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'CONCURRENT_MODIFICATION') {
          toast('다른 사람이 먼저 수정했어요. 최신 내용으로 바꿨으니 다시 시도해 주세요.', 'error')
          void qc.invalidateQueries()
          return
        }
        toast(error.message, 'error')
        return
      }
      toast('알 수 없는 오류가 발생했습니다.', 'error')
    },
  })
}
