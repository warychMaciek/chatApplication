document.addEventListener('DOMContentLoaded', () => {
    // saving display name from the user on the local storage
    const form = document.querySelector('#form');
    const channels = document.querySelector('.channels');
    let currentPath;

    if (localStorage.getItem('display_name') !== null) {
        displayName(localStorage.getItem('display_name'));
    } else {
        form.onsubmit = () => {
            if (document.querySelector('#display_name').value === '') {
                return false;
            } else {
                localStorage.setItem('display_name', document.querySelector('#display_name').value);
                displayName(localStorage.getItem('display_name'));
            }
        };
    };
    
    function displayName(name) {
        form.innerHTML = '<p>Hello ' + name +'. Feel free to create a new channel or choose an existing one.<p>';
        channels.style.display = 'block';
    };
    
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // creating new channel and sending information about it to the server
    socket.on('connect', () => {
        document.querySelector('#add_channel_btn').addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.querySelector('#new_channel').value;
            const channels = document.querySelectorAll('li');
            const label = document.querySelector('#label_new');
            let channelExists = false;
            
            channels.forEach(channel => {
                if (channel.innerText === name) {
                    channelExists = true;
                };
            });

            if (name === '') {
                label.innerText = 'Please, insert the name of a new channel.';
                return false;
            } else if (channelExists) {
                label.innerText = 'Channel exists, please choose another name.';
                return false;
            } else {
                label.innerText = '';
                socket.emit('add channel', {'name': name});
                document.querySelector('#new_channel').value = '';
                return false;
            };
        });

        // sending new message to the server
        document.querySelector('#send_message_btn').addEventListener('click', (e) => {
            e.preventDefault();
            const message = document.querySelector('#message').value;
            
            if (message === '') {
                return false;
            } else {
                const author = localStorage.getItem('display_name');
                const timestamp = get_date();

                socket.emit('send message', {'author': author, 'message': message, 'timestamp': timestamp, 'channel': currentPath});
                document.querySelector('#message').value = '';
                return false;
            };
        });

        // uploading file 
        document.querySelector('#send_file_btn').addEventListener('click', function(e) {
            e.preventDefault();
            const file = document.querySelector('#file').files[0];
            this.disabled = true;

            if (file === undefined) {
                return false;
            } else {
                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = (e) => {
                    const url = e.target.result;
                    const author = localStorage.getItem('display_name');
                    const timestamp = get_date();

                    socket.emit('send file', {'file_name': file.name, 'url': url, 'author': author, 'timestamp': timestamp, 'channel': currentPath});
                    document.querySelector('#file').value = null;
                    this.disabled = false;
                    return false;
                };
            };
        });
    });

    socket.on('publish file', data => {
        if (currentPath == data.channel) {
            if (data.author === localStorage.getItem('display_name')) {
                document.querySelector('#messages').innerHTML += `<br><div class="single_message my_single_message"><a href="${data.url}" download="${data.file_name}">${data.file_name}</a></div><br><div class="single_message_info my_single_message_info">${data.author}<br>${data.timestamp}</div>`;
            } else {
                document.querySelector('#messages').innerHTML += `<br><div class="single_message"><a href="${data.url}" download="${data.file_name}">${data.file_name}</a></div><br><div class="single_message_info">${data.author}<br>${data.timestamp}</div>`;
            }
            return false;
        } else {
            return false;
        };
    });

    // remembering the channel
    if (localStorage.getItem('current_channel') !== null) {
        currentPath = localStorage.getItem('current_channel');
        load_channel(localStorage.getItem('current_channel'));
    };

    // showing and updating list of channels
    socket.on('create channel', data => {
        const url = Flask.url_for('channel', {'type': data[data.length - 1]});
        document.querySelector('#channels_list').innerHTML += `<li><a class="channel_link" href="${url}">${data[data.length - 1]}</li>`;
        update_links();
    });

    // publishing message on the channel
    socket.on('publish message', data => {
        if (currentPath == data.channel) {
            if (data.author === localStorage.getItem('display_name')) {
                document.querySelector('#messages').innerHTML += `<br><div class="single_message my_single_message">${data.message}</div><br><div class="single_message_info my_single_message_info">${data.author}<br>${data.timestamp}</div>`;
            } else {
                document.querySelector('#messages').innerHTML += `<br><div class="single_message">${data.message}</div><br><div class="single_message_info">${data.author}<br>${data.timestamp}</div>`;
            }
            return false;
        } else {
            return false;
        };
    });

    // function to set link to channel variable/ also function is used to update listener after creating new channel
    function update_links() {
        document.querySelectorAll('.channel_link').forEach(link => {
            link.onclick = () => {
                const channel = link.innerText;
                load_channel(channel);
                currentPath = channel;
                localStorage.setItem('current_channel', currentPath);
                return false;
            };
        });
    };
    update_links();

    // showing content of the channel
    function load_channel(channel) {
        const request = new XMLHttpRequest();
        request.open('GET', `/channel?type=${channel}`);
        request.onload = () => {
            const response = JSON.parse(request.responseText);
            document.querySelector('#messages').innerHTML = `<h2>You are writing on the ${channel} channel.</h2>`;
            
            for (let i = response.length; i > 0; i--) {
                if (response[i-1].hasOwnProperty('url')) {
                    if (response[i-1].author === localStorage.getItem('display_name')) {
                        document.querySelector('#messages').innerHTML += `<br><div class="single_message my_single_message"><a href="${response[i-1].url}" download="${response[i-1].file_name}">${response[i-1].file_name}</a></div><br><div class="single_message_info my_single_message_info">${response[i-1].author}<br>${response[i-1].timestamp}</div>`;
                    } else {
                        document.querySelector('#messages').innerHTML += `<br><div class="single_message"><a href="${response[i-1].url}" download="${response[i-1].file_name}">${response[i-1].file_name}</a></div><br><div class="single_message_info">${response[i-1].author}<br>${response[i-1].timestamp}</div>`;
                    }
                } else {
                    if (response[i-1].author === localStorage.getItem('display_name')) {
                        document.querySelector('#messages').innerHTML += `<br><div class="single_message my_single_message">${response[i-1].message}</div><br><div class="single_message_info my_single_message_info">${response[i-1].author}<br>${response[i-1].timestamp}</div>`;
                    } else {
                        document.querySelector('#messages').innerHTML += `<br><div class="single_message">${response[i-1].message}</div><br><div class="single_message_info">${response[i-1].author}<br>${response[i-1].timestamp}</div>`;
                    };
                };
            };
            
            document.querySelector('#form').style.display = 'none';
            document.querySelector('.channels').style.display = 'none';
            document.querySelector('.channel_window').style.display = 'block';

            //pushing state to url and updating title
            document.title = 'Flack - ' + channel;
            history.pushState({'title': channel, 'text': channel}, channel, channel);
        };
        request.send();
    };

    window.onpopstate = e => {
        const data = e.state;
        document.title = 'Flack - ' + data.title;
        document.querySelector('#messages').innerHTML = data.text;
    };

    get_date = () => {
        const date = new Date();
        const today = String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + date.getFullYear();
        const time = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0') + ':' + String(date.getSeconds()).padStart(2, '0');
        const timestamp = time + ' ' + today;
        return timestamp;
    };

    document.querySelector('#channels_list_btn').addEventListener('click', () => {
        localStorage.removeItem('current_channel');
        currentPath = null;
    });

});