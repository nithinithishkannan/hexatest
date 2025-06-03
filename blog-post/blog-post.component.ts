import { Component, OnInit } from '@angular/core';
import { ApiService, BlogPost, BlogPostResponse, Comment, CommentResponse } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class BlogPostComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  loading = false;
  error = '';
  editingPostId: number | null = null;
  editingPost: BlogPost = { title: '', content: '', tag: '' };

  showCreateForm = false;
  newPost: BlogPost = { title: '', content: '', tag: '' };

  showCommentForm: { [key: number]: boolean } = {};
  newComment: { [key: number]: Comment } = {};
  commentLoading: { [key: number]: boolean } = {};

  allBlogPosts: BlogPost[] = [];
  selectedGenre: string = '';



  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadBlogPosts();
  }

  genres: string[] = [
    'Technology',
    'Health',
    'Education',
    'Travel',
    'Food',
    'Lifestyle',
    'Finance',
    'Entertainment',
    'Sports',
    'Science'
  ];

  // Computed property for total pages
  get totalPages(): number {
    return Math.ceil(this.blogPosts.length / this.postsPerPage);
  }

  loadBlogPosts(): void {
    this.loading = true;
    this.error = '';

    this.apiService.getAllBlogPosts().subscribe({
      next: (posts: BlogPost[]) => {
        this.allBlogPosts = posts; // Store all posts
        this.blogPosts = posts; // Display all posts initially
        this.updatePaginatedPosts(); // Update paginated posts
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to load blog posts';
        this.loading = false;
        console.error('Error loading blog posts:', error);
      }
    });
  }

  startEditing(post: BlogPost): void {
    this.editingPostId = post.id!;
    this.editingPost = { ...post };
  }

  cancelEditing(): void {
    this.editingPostId = null;
    this.editingPost = { title: '', content: '', tag: '' };
  }

  saveEdit(): void {
    if (!this.editingPost.title.trim() || !this.editingPost.content.trim()) {
      this.error = 'Title,genre,content are required';
      return;
    }

    if (this.editingPost.title.length > 200) {
      this.error = 'Title cannot exceed 200 characters';
      return;
    }

    this.loading = true;
    this.error = '';

    this.apiService.updateBlogPost(this.editingPostId!, this.editingPost).subscribe({
      next: (response: BlogPostResponse) => {
        const index = this.blogPosts.findIndex(p => p.id === this.editingPostId);
        const allIndex = this.allBlogPosts.findIndex(p => p.id === this.editingPostId);

        if (index !== -1 && response.blog_post) {
          this.blogPosts[index] = response.blog_post;
        }
        if (allIndex !== -1 && response.blog_post) {
          this.allBlogPosts[allIndex] = response.blog_post;
        }

        this.updatePaginatedPosts();
        this.cancelEditing();
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to update blog post';
        this.loading = false;
        console.error('Error updating blog post:', error);
      }
    });
  }

  deletePost(post: BlogPost): void {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.apiService.deleteBlogPost(post.id!).subscribe({
      next: () => {
        this.blogPosts = this.blogPosts.filter(p => p.id !== post.id);
        this.allBlogPosts = this.allBlogPosts.filter(p => p.id !== post.id);

        // Adjust current page if necessary
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }

        this.updatePaginatedPosts();
        this.loading = false;

        if (this.editingPostId === post.id) {
          this.cancelEditing();
        }
      },
      error: (error: any) => {
        this.error = 'Failed to delete blog post';
        this.loading = false;
        console.error('Error deleting blog post:', error);
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.newPost = { title: '', content: '', tag: '' };
    }
    this.error = '';
  }

  createPost(): void {
    if (!this.newPost.title.trim() || !this.newPost.content.trim()) {
      this.error = 'Title,content,Genre are required';
      return;
    }

    if (!this.newPost.tag.trim()) {
      this.error = 'Genre is required';
      return;
    }

    if (this.newPost.title.length > 200) {
      this.error = 'Title cannot exceed 200 characters';
      return;
    }

    this.loading = true;
    this.error = '';

    this.apiService.createBlogPost(this.newPost).subscribe({
      next: (response: BlogPostResponse) => {
        if (response.blog_post) {
          this.allBlogPosts.unshift(response.blog_post);
          this.filterByGenre();
          this.updatePaginatedPosts();
        }
        this.newPost = { title: '', content: '', tag: '' };
        this.showCreateForm = false;
        this.loading = false;
        this.error = '';
      },
      error: (error: any) => {
        this.error = 'Failed to create blog post';
        this.loading = false;
        console.error('Error creating blog post:', error);
      }
    });
  }

  toggleCommentForm(postId: number): void {
    this.showCommentForm[postId] = !this.showCommentForm[postId];

    if (this.showCommentForm[postId]) {
      this.newComment[postId] = {
        blog_post_id: postId,
        name: '',
        comment_text: ''
      };
    } else {
      delete this.newComment[postId];
    }
  }

  addComment(postId: number): void {
    const comment = this.newComment[postId];

    if (!comment || !comment.name.trim() || !comment.comment_text.trim()) {
      this.error = 'Name and comment are required';
      return;
    }

    if (comment.name.length > 25) {
      this.error = 'Name cannot exceed 25 characters';
      return;
    }

    if (comment.comment_text.length > 500) {
      this.error = 'Comment cannot exceed 500 characters';
      return;
    }

    this.commentLoading[postId] = true;
    this.error = ''; // Clear error before API call

    this.apiService.addComment(comment).subscribe({
      next: (response) => {
        if (response.message === 'Comment created successfully.') {
          // Clean up form after successful submission
          delete this.newComment[postId];
          this.showCommentForm[postId] = false;
          this.error = ''; // Clear any existing errors
          alert('Comment added successfully!');
        }
        this.commentLoading[postId] = false;
      },
      error: (error) => {
        this.error = 'Failed to add comment';
        this.commentLoading[postId] = false;
        console.error('Error adding comment:', error);
      }
    });
  }

  cancelComment(postId: number): void {
    this.showCommentForm[postId] = false;
    delete this.newComment[postId];
    this.error = '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  isEditing(post: BlogPost): boolean {
    return this.editingPostId === post.id;
  }

  isShowingCommentForm(postId: number): boolean {
    return this.showCommentForm[postId] || false;
  }

  isCommentLoading(postId: number): boolean {
    return this.commentLoading[postId] || false;
  }

  filterByGenre(): void {
    if (this.selectedGenre === '') {
      this.blogPosts = [...this.allBlogPosts];
    } else {
      this.blogPosts = this.allBlogPosts.filter(post => post.tag === this.selectedGenre);
    }
    this.currentPage = 1;
    this.updatePaginatedPosts();
  }





 // Pagination
 currentPage = 1;
 postsPerPage = 3;
 paginatedPosts: BlogPost[] = [];


  // Pagination
  updatePaginatedPosts(): void {
    const startIndex = (this.currentPage - 1) * this.postsPerPage;
    const endIndex = startIndex + this.postsPerPage;
    this.paginatedPosts = this.blogPosts.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedPosts();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedPosts();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPosts();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
