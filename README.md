# @danielgindi/selectbox

A full featured selectbox and drop down.

* Virtual list (can show a list with millions of items)
* Live search right there in the box
* Single or multi mode
* Tags (items in the search box)
* Custom item rendering
* Variable height items
* Highly configurable
* No dependency on any ui framework
* Can work in any framework or in vanilla js
* Has existing Vue bindings
* The droplist part can be used separately for floating menus etc.

This is a real good component, which is the product of evolution over years. Until I sat down one day and refactored it into one cool thing.  
I really hope to get this documented so everyone can enjoy it.

### Installing

* adding to package.json: `npm i --save @danielgindi/selectbox`
* vanilla js:
  ```js
  import { SelectBox, DropList } from '@danielgindi/selectbox';
  ```
* vuejs:
  ```js
  import { SelectBox, DropList } from '@danielgindi/selectbox/vue';
  ```
* add the scss:
  ```scss
  @import '@danielgindi/selectbox/scss/droplist';
  @import '@danielgindi/selectbox/scss/selectbox'; /* depends on droplist css */
  ```
* or the compiled css:
  ```css
  @import '@danielgindi/selectbox/css/droplist';
  @import '@danielgindi/selectbox/css/selectbox'; /* depends on droplist css */
  ```

## Example

You are welcome to open a PR and add examples, docs, and demo pages :-)

## Api

You are welcome to open a PR and add some api docs :-)

## Vite

When using with Vite - you'll need to add this `optimizeDeps to` `vite.config.js`:
```
optimizeDeps: {
  include: [
    'fast-deep-equal',
  ],
},
```

Otherwise, Vite will complain about `fast-deep-equal` entry point.

## Me
* Hi! I am Daniel Cohen Gindi. Or in short- Daniel.
* danielgindi@gmail.com is my email address.
* That's all you need to know.

## Help

If you want to help, you could:
* Actually code, and issue pull requests
* Test the library under different conditions and browsers
* Create more demo pages
* Spread the word
* [![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=45T5QNATLCPS2)


## License

All the code here is under MIT license. Which means you could do virtually anything with the code.
I will appreciate it very much if you keep an attribution where appropriate.

    The MIT License (MIT)
    
    Copyright (c) 2013 Daniel Cohen Gindi (danielgindi@gmail.com)
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
