import { Component } from 'react';

import './styles.css';

import { Button } from '../../components/Button';
import { PostCard } from '../../components/PostCard';
import { loadPosts } from '../../utils/load-posts';

export class Home extends Component {
  state = {
    posts: [],
    allPosts: [],
    page:0,
    postsPerpage:6,
    searchValue:''
  };

  async componentDidMount() {
    await this.loadPosts();
  }

  loadPosts = async () => {
    const {page, postsPerpage}= this.state;
    const postsAndPhotos= await loadPosts();
    this.setState({ 
      posts: postsAndPhotos.slice(page,postsPerpage),
      allPosts: postsAndPhotos
     });
  }

  loadMorePosts = () =>{
    const {
      page,
      postsPerpage,
      allPosts,
      posts
    } = this.state;
    const nextPage = page + postsPerpage;
    const nextPosts = allPosts.slice(nextPage,nextPage+postsPerpage);
    posts.push(...nextPosts);
    this.setState({ 
      posts,
      page: nextPage
     });
  }

  handleChange= (e) =>{
    this.setState({ searchValue: e.target.value });
  }

  componentDidUpdate() {

  }
  componentWillUnmount() {

  }

  render() {
    const { posts, page, postsPerpage, allPosts,searchValue } = this.state;
    const  noMorePosts = page + postsPerpage >= allPosts.length;

    const filteredPosts= !!searchValue ?
      allPosts.filter(post=>{
        return post.title.toLowerCase().includes(
          searchValue.toLowerCase().trim()
        )
      })
    : posts;


    return (
      <section className="container">

        <div className="search-container">
          <input
            type="search"
            className="text-input"
            onChange={this.handleChange}
            value={searchValue}
            placeholder="Localizar pelo título"
          />
          { !!searchValue && ( <h3>Procurando por '{searchValue}'</h3> ) }
          { !filteredPosts.length && ( <p>Nenhum resultado encontrado</p> ) }
        </div>

        <div className="posts">
          {filteredPosts.map(post => (  <PostCard key={post.id} post={post} /> ))}
        </div>

        { !searchValue && (
            <div className="button-container">
            <Button
              text={noMorePosts?"Chegou ao fim":"Carregar mais posts"}
              onCLick={this.loadMorePosts}
              disabled={noMorePosts}
              />
            </div>
          )
        }

      </section>
    )
  }
}