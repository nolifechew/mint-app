import "./css/style.css";


function App() {
  return (
    <div className="App">

<div className="wrapper">
  
  <header className="header">
    <a href="index.html" className="header-logo"></a>
    <div className="menu-toggle">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div className="header-menu">
      <div className="header-socials">
        <a href="https://twitter.com/Yugennft" target="_blank"><img src="img/ico_twiter.svg" alt=""></img></a>
        <a href="http://www.discord.gg/yugencity" target="_blank"><img src="img/ico_discord.svg" alt=""></img></a>
        
      </div>
      <ul className="header-nav">
        <li className="glitch-hover"><a href="index.html#promo" className="glitching" data-text="Home">Home</a></li>
        <li className="glitch-hover"><a href="index.html#club" className="glitching" data-text="Cyber City">Cyber City</a></li>
        <li className="glitch-hover"><a href="index.html#rinen" className="glitching" data-text="Tao">Tao</a></li>
        <li className="glitch-hover"><a href="index.html#strategy" className="glitching" data-text="Story">Story</a></li>
        <li className="glitch-hover"><a href="index.html#team" className="glitching" data-text="Team">Team</a></li>
        <li className="glitch-hover"><a href="index.html#faq" className="glitching" data-text="FAQ">FAQ</a></li>
        <li className="glitch-hover"><a href=".mint" className="go_to glitching" data-text="mint">mint</a></li>
      </ul>
    </div>
  </header>

  <section className="mint">
    <div className="mint-bg"></div>
    <div className="container">
      <div className="mint-inner">
        <div className="mint-decor-1"></div>
        <div className="mint-content-decor"></div>
        <div className="mint-content">
          <div className="mint-content-bg"></div>
          <h2 className="mint-title glitched" data-text="Mint YUGEN">Mint YUGEN</h2>
          <p className="mint-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.</p>
          <form action="" className="mint-form">
            <h3 className="mint-form__total">0 eth</h3>
            <p className="mint-form__text"><span id = "mint-form_text_left">Generated text</span> <span id = "mint-form_text_left">Generated text</span></p>
            <div className="mint-form__calc">
              <i className="mint-form__minus"></i>
              <div className="mint-form__count">
                <input type="number" value="0" id="mintAmount"></input>
              </div>
              <i className="mint-form__plus"></i>
            </div>
            <a href="#" className="mint-form__button">connect wallet</a>
          </form>
        </div>
      </div>
    </div>
  </section>

  <footer className="footer">
    <div className="footer-bg"></div>
    <div className="container">
      <div className="footer-socials">
        <a href="https://twitter.com/Yugennft" target="_blank"><img src="img/ico_twiter-2.svg" alt="social"></img></a>
        <a href="http://www.discord.gg/yugencity" target="_blank"><img src="img/ico_discord-2.svg" alt="social"></img></a>
       
      <p className="footer-copy">Copyright © 2022</p>
    </div>
    </div>
  </footer>
  
</div>

<script type="text/javascript" src="js/jquery-3.1.0.min.js"></script>
<script type="text/javascript" src="js/slick.min.js"></script>
<script data-main="js/scripts" src="scripts/require.js"></script>


</div>
  );
}

export default App;
