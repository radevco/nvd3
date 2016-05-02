nv.models.timeline = function(d) {
  "use strict";

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------
  var margin = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    orient = 'left',
    reverse = false,
    width = 380,
    height = 30,
    tickFormat = null,
    dispatch = d3.dispatch('elementMouseover', 'elementMouseout', 'elementMousemove'),
    numberOfRecords = (d === undefined ? 0 : d.length),
    startTime = new Date().getTime(),
    endTime = new Date().getTime(),
    duration = 0,
    container = null;

  function chart(g) {
    var numberOfGroups = g.length;

    g.each(function(d, i) {
      var availableWidth = width - margin.left - margin.right,
        availableHeight = height - margin.top - margin.bottom;

      container = d3.select(this);
      nv.utils.initSVG(container);

      var activitiez = new Activities(d);
      g = d3.select(this);

      // Setup Scales
      // Compute the new x-scale.
      var x1 = d3.scale.linear()
        .domain([startTime, endTime])
        .range([0, width]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
        .domain([0, Infinity])
        .range(x1.range());

      // Stash the new scale.
      this.__chart__ = x1;

      var activity = g.selectAll("rect.range")
        .data(activitiez.all());

      activity.enter().append("rect")
        .attr("class", function(d, i) {
          return timelineActivityClassName(d, i);
        })
        .attr("data-time", function(d, i) {
          return d.start_time;
        })
        .attr("width", function(d, i) {
          return timelineWidth(x1, d, i);
        })
        .attr("height", height)
        .attr("x", function(d, i) {
          return timelineXPos(x1, d);
        })
        .transition()
        .duration(duration)
        .attr("width", function(d, i) {
          return timelineWidth(x1, d, i);
        })
        .attr("x", function(d, i) {
          return timelineXPos(x1, d);
        });

        activity.on('mouseover', function(d,i) {
            dispatch.elementMouseover({
                value: Math.round((d.end_time - d.start_time) / 60000),
                label: d.status,
                color: d3.select(this).style("fill")
            })
        })
        .on('mousemove', function() {
            dispatch.elementMousemove({
              value: Math.round((d.end_time - d.start_time) / 60000),
              label: d.status,
              color: d3.select(this).style("fill")
            })
        })
        .on('mouseout', function() {
            dispatch.elementMouseout({
              value: Math.round((d.end_time - d.start_time) / 60000),
              label: d.status,
              color: d3.select(this).style("fill")
            })
        });

      activity.transition()
        .duration(duration)
        .attr("x", function(d, i) {
          return timelineXPos(x1, d);
        })
        .attr("width", function(d, i) {
          return timelineWidth(x1, d, i);
        })
        .attr("height", height);

      // Compute the tick format.
      var format = function(n) {
        // tick text
        return moment(new Date(parseInt(n))).format('h:mm A');
      };

      var tickData = function() {
        var j = startTime;
        var tickArray = [];
        while (j <= endTime) {
          tickArray.push(j);
          j = j + 3600000;
        }
        return tickArray;
      };

      var tick = g.selectAll("g.tick")
        .data(tickData(), function(d) {
          return this.textContent || format(d);
        });
      if (i === numberOfRecords - 1) {
        g.append("line")
          .attr("x1", x1(startTime))
          .attr("y1", height + 10)
          .attr("x2", x1(endTime))
          .attr("y2", height + 10)
          .attr("stroke-width", 1)
          .attr("stroke", "black");

        // Initialize the ticks with the old scale, x0.
        var tickEnter = tick.enter().append("g")
          .attr("class", "tick")
          .attr("transform", timelineTranslate(x0))
          .style("opacity", 1e-6);

        tickEnter.append("line")
          .attr("y1", height)
          .attr("y2", height * 7 / 6);

        tickEnter.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .attr("y", height + 20)
          .text(format);

        // Transition the entering ticks to the new scale, x1.
        tickEnter.transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1);

        // Transition the updating ticks to the new scale, x1.
        var tickUpdate = tick.transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1);

        tickUpdate.select("line")
          .attr("y1", height)
          .attr("y2", height + 10);

        tickUpdate.select("text")
          .attr("y", height + 20);

        // Transition the exiting ticks to the new scale, x1.
        tick.exit().transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1e-6)
          .remove();
      }

      return chart;
    });
  }
  // left, right, top, bottom
  chart.orient = function(x) {
    if (!arguments.length) return orient;
    orient = x;
    reverse = orient == "right" || orient == "bottom";
    return chart;
  };

  chart.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return chart;
  };

  chart.tickFormat = function(x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return chart;
  };

  chart.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return chart;
  };

  function Activities(d) {
    this.startTimes = function() {
      return $(d.activities).map(function(i, n) {
        return transformDate(n.start_time);
      }).toArray();
    };

    this.endTimes = function() {
      return $(d.activities).map(function(i, n) {
        return transformDate(n.end_time);
      }).toArray();
    };

    this.all = function() {
      return $(d.activities).map(function(i, n) {
        return ({
          "status": n.status,
          "start_time": transformDate(n.start_time),
          "end_time": transformDate(n.end_time)
        });
      }).toArray();
    };
  }

  function timelineTranslate(x) {
    return function(d) {
      return "translate(" + x(d) + ",0)";
    };
  }

  function timelineWidth(x, d, i) {
    // TODO: all activity times should be transformed once
    var start = d.start_time;
    var end = d.end_time;
    return Math.abs(x(end) - x(start));
  }

  function timelineXPos(x1, d) {
    return x1(d.start_time);
  }

  function timelineActivityClassName(d, i) {
    return 'activity ' + d.status;
  }

  function transformDate(dateString) {
    if (dateString) {
      return moment.utc(dateString).toDate().getTime();
    } else {
      return 0;
    }
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  // dispatch.on('elementMouseover', function(evt) {
  //     evt['series'] = {
  //         key: evt.label,
  //         value: evt.value,
  //         color: evt.color
  //     };
  //     tooltip.data(evt).hidden(false);
  // });
  // scatter.dispatch.on('elementMouseover', function(){ dispatch.elementMouseover.apply(this, arguments); });
  //
  // chart.dispatch.on('elementMouseout.tooltip', function(evt) {
  //     tooltip.hidden(true);
  // });
  //
  // chart.dispatch.on('elementMousemove.tooltip', function(evt) {
  //     tooltip();
  // });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    // simple options, just get/set the necessary values
    activities: {
      get: function() {
        return activities;
      },
      set: function(_) {
        activities = _;
      }
    },
    tickFormat: {
      get: function() {
        return tickFormat;
      },
      set: function(_) {
        tickFormat = _;
      }
    },

    // options that require extra logic in the setter
    margin: {
      get: function() {
        return margin;
      },
      set: function(_) {
        margin.top = _.top !== undefined ? _.top : margin.top;
        margin.right = _.right !== undefined ? _.right : margin.right;
        margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
        margin.left = _.left !== undefined ? _.left : margin.left;
      }
    },
    orient: {
      get: function() {
        return orient;
      },
      set: function(_) { // left, right, top, bottom
        orient = _;
        reverse = orient == 'right' || orient == 'bottom';
      }
    },
    startTime: {
      get: function() {
        return startTime;
      },
      set: function(_) { // left, right, top, bottom
        startTime = new Date(_).getTime();
      }
    },
    endTime: {
      get: function() {
        return endTime;
      },
      set: function(_) { // left, right, top, bottom
        endTime = new Date(_).getTime();
      }
    }
  });

  nv.utils.initOptions(chart);
  return chart;
};
