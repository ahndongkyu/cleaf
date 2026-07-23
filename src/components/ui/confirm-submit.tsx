"use client";

// 서버 액션 form 안의 submit 버튼. 클릭 시 확인창을 띄우고, 취소하면 제출 막음.
export function ConfirmSubmit({
  message,
  className,
  children,
  form,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
  form?: string;
}) {
  return (
    <button
      type="submit"
      form={form}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
