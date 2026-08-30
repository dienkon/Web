const n="013_HTML_Sample",t="Mẫu Bài Viết Đầy Đủ Định Dạng HTML",o="ChemDex Team",e="khainiem",d="Tài liệu mẫu chứa đầy đủ các loại định dạng HTML, bảng biểu, hình ảnh, video, và liên kết để làm template.",r="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800",a=["HTML","Template","Mẫu"],i=`# Tiêu đề chính (H1)

Đây là một bài viết mẫu thể hiện các khả năng hiển thị HTML và Markdown của ChemDex. Bạn có thể sử dụng các thẻ HTML thông dụng để làm phong phú nội dung.

## 1. Định dạng văn bản

Bạn có thể in đậm **bold text**, in nghiêng *italic text*, hoặc kết hợp ***cả hai***. Bạn cũng có thể dùng thẻ \`<span style="color: #fca5a5;">màu sắc tùy chỉnh</span>\`.

## 2. Bảng biểu (Table)

<table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; text-align: left;">
  <thead style="background-color: rgba(255,255,255,0.1);">
    <tr>
      <th style="padding: 10px;">Loại</th>
      <th style="padding: 10px;">Mô tả</th>
      <th style="padding: 10px;">Ghi chú</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Nguyên tố</td>
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Chất cơ bản</td>
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Có 118 nguyên tố</td>
    </tr>
    <tr style="background-color: rgba(255,255,255,0.02);">
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Hợp chất</td>
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Cấu tạo từ nhiều nguyên tố</td>
      <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Vô hạn</td>
    </tr>
  </tbody>
</table>

## 3. Hình ảnh và liên kết

<img src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=800" alt="Phòng thí nghiệm" style="border-radius: 12px; width: 100%; margin: 20px 0;" />

Đây là một liên kết ngoài: <a href="https://chem-dex.vercel.app/" target="_blank" style="color: #60a5fa; text-decoration: underline;">Bảng Tuần Hoàn ChemDex</a>.

## 4. Ghi chú và cảnh báo

<div style="background-color: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 15px;">
  <strong style="color: #fcd34d;">Cảnh báo:</strong> Đây là một khối cảnh báo quan trọng bằng HTML.
</div>

<div style="background-color: rgba(56, 189, 248, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #38bdf8;">
  <strong style="color: #7dd3fc;">Thông tin:</strong> Đây là một khối thông tin hữu ích.
</div>

## 5. Danh sách (Lists)

### Danh sách không thứ tự:
- Mục 1
- Mục 2
  - Mục 2.1
  - Mục 2.2

### Danh sách có thứ tự:
1. Bước 1
2. Bước 2
3. Bước 3

## 6. Video nhúng (Iframe)

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-top: 20px;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`,h={id:n,title:t,author:o,category:e,summary:d,image:r,tags:a,content:i};export{o as author,e as category,i as content,h as default,n as id,r as image,d as summary,a as tags,t as title};
